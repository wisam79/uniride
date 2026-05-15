import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { Trip, TripStatus } from '@uniride/core';
import { canTransition } from '@uniride/core';
import { useAsyncData } from './useAsyncData';

const PAGE_SIZE = 20;

export function useDriverTrips(page = 0) {
  const result = useAsyncData<Trip[]>(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: driverData, error: driverError } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (driverError || !driverData) throw new Error('Driver profile not found');

    const from = page * PAGE_SIZE;
    const { data, error, count } = await supabase
      .from('trips')
      .select('*, routes(*)', { count: 'exact' })
      .eq('driver_id', driverData.id)
      .order('scheduled_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    return (data as Trip[]) || [];
  }, []);

  return {
    trips: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.execute,
    hasMore: true,
    isPending: result.isLoading,
  };
}

export { canTransition };
