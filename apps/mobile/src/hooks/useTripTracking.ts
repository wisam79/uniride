import { useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trip } from '@uniride/core';
import { useAsyncData } from './useAsyncData';
import { logger } from '../lib/logger';

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
  const result = useAsyncData<TripWithRoute | null>(async () => {
    if (!tripId) return null;

    const { data, error } = await supabase
      .from('trips')
      .select(
        '*, routes(start_lat, start_lng, end_lat, end_lng, title), drivers!inner(profiles!drivers_user_id_fkey(full_name, phone))',
      )
      .eq('id', tripId)
      .single();

    if (error) throw error;
    const rawData = data as any;
    const trip = data as TripWithRoute;

    const profileRow = Array.isArray(rawData.drivers?.profiles)
      ? rawData.drivers.profiles[0]
      : rawData.drivers?.profiles;
    const driver = profileRow
      ? { full_name: profileRow.full_name ?? '', phone: profileRow.phone ?? '' }
      : null;

    return { ...trip, driver };
  }, null);

  useEffect(() => {
    if (!tripId) return;

    const channel = supabase
      .channel(`trip-tracking-${tripId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
        () => {
          void result.execute();
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.warn('[Realtime] trip tracking channel error, re-fetching...', { status, tripId });
          void result.execute();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, result.execute]);

  return {
    trip: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.execute,
  };
}
