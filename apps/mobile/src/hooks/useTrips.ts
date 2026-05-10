import { useEffect, useState, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { Trip, TripStatus, Subscription } from '@uniride/core';

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

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, routes(*)')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions((data as SubscriptionWithRoute[]) || []);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  return { subscriptions, isLoading, error, refetch: fetchSubscriptions };
}

export function useActiveTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrips() {
      try {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .in('status', ['driver_waiting', 'in_transit'])
          .order('scheduled_at', { ascending: false });

        if (error) throw error;
        setTrips((data as Trip[]) || []);
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrips();

    const channel = supabase
      .channel('trips-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTrips((prev) => [payload.new as Trip, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setTrips((prev) =>
            prev.map((t) => (t.id === (payload.new as Trip).id ? (payload.new as Trip) : t))
          );
        } else if (payload.eventType === 'DELETE') {
          const deletedId = (payload.old as { id: string }).id;
          setTrips((prev) => prev.filter((t) => t.id !== deletedId));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { trips, isLoading, error };
}

export function useTripTracking(tripId: string | null) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tripId) {
      setIsLoading(false);
      return;
    }

    async function fetchTrip() {
      const { data } = await supabase.from('trips').select('*').eq('id', tripId).single();
      setTrip(data as Trip | null);
      setIsLoading(false);
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

  return { trip, isLoading };
}

export function useDriverTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('trips')
        .select('*, routes(*)')
        .order('scheduled_at', { ascending: false });

      if (error) throw error;
      setTrips((data as Trip[]) || []);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();

    const channelId = `driver-trips-${Date.now()}-${Math.random()}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        fetchTrips();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTrips]);

  return { trips, isLoading, error, refetch: fetchTrips };
}

export function useLocationTracker() {
  const watchRef = useRef<Location.LocationSubscription | null>(null);

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
          await supabase.rpc('update_trip_location', {
            p_trip_id: tripId,
            p_lat: coords.latitude,
            p_lng: coords.longitude,
          });
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
