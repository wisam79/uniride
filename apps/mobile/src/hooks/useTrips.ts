import { useEffect, useState, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Trip, TripStatus, Subscription } from '@uniride/core';

const GPS_QUEUE_KEY = 'gps_offline_queue';
const PAGE_SIZE = 20;

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'An unknown error occurred';
}

interface SubscriptionWithRoute extends Subscription {
  routes: {
    id: string;
    title: string;
    start_location: string;
    end_location: string;
    price: number;
  } | null;
}

import { OfflineCache } from '../lib/offlineCache';

export function useSubscriptions(page = 0) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Try to load offline
        const offlineSub = await OfflineCache.getActiveSubscription();
        if (offlineSub) setSubscriptions([offlineSub as SubscriptionWithRoute]);
        return;
      }

      const from = page * PAGE_SIZE;
      const { data, error, count } = await supabase
        .from('subscriptions')
        .select('*, routes(*)', { count: 'exact' })
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      const newSubs = (data as SubscriptionWithRoute[]) || [];
      setSubscriptions(page === 0 ? newSubs : (prev) => [...prev, ...newSubs]);
      setHasMore(newSubs.length === PAGE_SIZE && (!count || from + PAGE_SIZE < count));

      // Cache active subscription for offline use
      if (page === 0) {
        const activeSub = newSubs.find(s => s.status === 'active');
        await OfflineCache.saveActiveSubscription(activeSub || null);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      // Fallback to offline cache on network error
      if (page === 0) {
        const offlineSub = await OfflineCache.getActiveSubscription();
        if (offlineSub) {
          setSubscriptions([offlineSub as SubscriptionWithRoute]);
          setError(null); // Clear error if we have offline data
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  return { subscriptions, isLoading, error, refetch: fetchSubscriptions, hasMore };
}

export function useActiveTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .in('status', ['driver_waiting', 'in_transit'])
        .order('scheduled_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTrips((data as Trip[]) || []);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetchTrips();

    const channel = supabase
      .channel('trips-active-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        if (!isMounted) return;
        fetchTrips();
      })
      .subscribe((status) => {
        // Auto-reconnect on channel error or timeout
        if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && isMounted) {
          console.warn('[Realtime] trips-active channel error, re-fetching...', status);
          fetchTrips();
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [fetchTrips]);

  return { trips, isLoading, error, refetch: fetchTrips };
}

export interface TripWithRoute extends Trip {
  routes: {
    start_lat: number | null;
    start_lng: number | null;
    end_lat: number | null;
    end_lng: number | null;
    title: string;
  } | null;
  driver: {
    full_name: string;
    phone: string;
  } | null;
}

export function useTripTracking(tripId: string | null) {
  const [trip, setTrip] = useState<TripWithRoute | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrip = useCallback(async () => {
    if (!tripId) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('trips')
        .select('*, routes(start_lat, start_lng, end_lat, end_lng, title)')
        .eq('id', tripId)
        .single();
      if (error) throw error;
      const baseTrip = data as TripWithRoute;

      let driver: TripWithRoute['driver'] = null;
      if (baseTrip.driver_id) {
        const { data: driverRecord } = await supabase
          .from('drivers')
          .select('profiles!drivers_user_id_fkey(full_name, phone)')
          .eq('id', baseTrip.driver_id)
          .single();

        const profileRow = Array.isArray(driverRecord?.profiles)
          ? driverRecord.profiles[0]
          : driverRecord?.profiles;
        driver = profileRow
          ? { full_name: profileRow.full_name ?? '', phone: profileRow.phone ?? '' }
          : null;
      }

      setTrip({ ...baseTrip, driver });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchTrip();

    const channel = supabase
      .channel(`trip-${tripId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
        () => {
          // Re-fetch full trip with joins — ensures driver/route data stays fresh
          fetchTrip();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Realtime] trip tracking reconnecting...', status);
          fetchTrip();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, fetchTrip]);

  return { trip, isLoading, error, refetch: fetchTrip };
}

export function useDriverTrips(page = 0) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchTrips = useCallback(async () => {
    try {
      setIsLoading(true);
      const from = page * PAGE_SIZE;
      const { data, error, count } = await supabase
        .from('trips')
        .select('*, routes(*)', { count: 'exact' })
        .order('scheduled_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      const newTrips = (data as Trip[]) || [];
      setTrips(page === 0 ? newTrips : (prev) => [...prev, ...newTrips]);
      setHasMore(newTrips.length === PAGE_SIZE && (!count || from + PAGE_SIZE < count));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchTrips();

    const channel = supabase
      .channel('driver-trips-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        fetchTrips();
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Realtime] driver-trips channel error, re-fetching...', status);
          fetchTrips();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTrips]);

  return { trips, isLoading, error, refetch: fetchTrips, hasMore };
}

interface QueuedLocation {
  tripId: string;
  lat: number;
  lng: number;
  timestamp: number;
  retries: number;
}

async function flushGpsQueue() {
  try {
    const queueData = await AsyncStorage.getItem(GPS_QUEUE_KEY);
    if (!queueData) return;

    const queue: QueuedLocation[] = JSON.parse(queueData);
    if (queue.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (const item of queue) {
      try {
        await supabase.rpc('update_trip_location', {
          p_trip_id: item.tripId,
          p_lat: item.lat,
          p_lng: item.lng,
        });
      } catch (err) {
        item.retries++;
        if (item.retries >= 3) {
          console.warn('GPS update failed after 3 retries:', item);
        }
      }
    }

    const remaining = queue.filter((q) => q.retries < 3);
    if (remaining.length > 0) {
      await AsyncStorage.setItem(GPS_QUEUE_KEY, JSON.stringify(remaining));
    } else {
      await AsyncStorage.removeItem(GPS_QUEUE_KEY);
    }
  } catch (err) {
    console.warn('Failed to flush GPS queue:', err);
  }
}

async function queueLocationUpdate(tripId: string, lat: number, lng: number) {
  const item: QueuedLocation = { tripId, lat, lng, timestamp: Date.now(), retries: 0 };
  const existing = await AsyncStorage.getItem(GPS_QUEUE_KEY);
  const queue: QueuedLocation[] = existing ? JSON.parse(existing) : [];
  queue.push(item);
  await AsyncStorage.setItem(GPS_QUEUE_KEY, JSON.stringify(queue));
}

export function useLocationTracker() {
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const isOnlineRef = useRef(true);

  const startTracking = useCallback(async (tripId: string) => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return { error: 'Location permission denied' };
      }

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        async (location) => {
          const { coords } = location;

          if (!isOnlineRef.current) {
            await queueLocationUpdate(tripId, coords.latitude, coords.longitude);
            return;
          }

          const { error } = await supabase.rpc('update_trip_location', {
            p_trip_id: tripId,
            p_lat: coords.latitude,
            p_lng: coords.longitude,
          });

          if (error) {
            if (error.code === 'NETWORK_ERROR' || !error.code) {
              isOnlineRef.current = false;
              await queueLocationUpdate(tripId, coords.latitude, coords.longitude);
              setTimeout(() => {
                isOnlineRef.current = true;
                flushGpsQueue();
              }, 5000);
            }
          }
        }
      );

      return { error: null };
    } catch (err: unknown) {
      return { error: getErrorMessage(err) };
    }
  }, []);

  const stopTracking = useCallback(() => {
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
  }, []);

  return { startTracking, stopTracking };
}
