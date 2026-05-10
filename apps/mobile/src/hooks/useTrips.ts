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

export function useSubscriptions(page = 0) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
    } catch (err: unknown) {
      setError(getErrorMessage(err));
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
  const [lastRealtimeUpdate, setLastRealtimeUpdate] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    async function fetchTrips() {
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
        if (isMounted) {
          setTrips((data as Trip[]) || []);
        }
      } catch (err: unknown) {
        if (isMounted) setError(getErrorMessage(err));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchTrips();

    const channel = supabase
      .channel('trips-active-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, (payload) => {
        if (!isMounted) return;
        const newTrip = payload.new as Trip;
        const oldTrip = payload.old as { id: string } | undefined;

        if (payload.eventType === 'INSERT' &&
            ['driver_waiting', 'in_transit'].includes(newTrip.status)) {
          setTrips((prev) => {
            if (prev.find((t) => t.id === newTrip.id)) return prev;
            return [newTrip, ...prev];
          });
          setLastRealtimeUpdate(Date.now());
        } else if (payload.eventType === 'UPDATE') {
          if (['completed', 'cancelled', 'absent'].includes(newTrip.status)) {
            setTrips((prev) => prev.filter((t) => t.id !== newTrip.id));
          } else {
            setTrips((prev) =>
              prev.map((t) => (t.id === newTrip.id ? newTrip : t))
            );
          }
          setLastRealtimeUpdate(Date.now());
        } else if (payload.eventType === 'DELETE' && oldTrip) {
          setTrips((prev) => prev.filter((t) => t.id !== oldTrip.id));
          setLastRealtimeUpdate(Date.now());
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { trips, isLoading, error, refetch: () => {} };
}

export function useTripTracking(tripId: string | null) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) {
      setIsLoading(false);
      return;
    }

    async function fetchTrip() {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .single();
        if (error) throw error;
        setTrip(data as Trip);
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrip();

    const channel = supabase
      .channel(`trip-${tripId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
        (payload) => {
          setTrip(payload.new as Trip);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  return { trip, isLoading, error };
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
      .subscribe();

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
    console.error('Failed to flush GPS queue:', err);
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