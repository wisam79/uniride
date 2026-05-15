import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { Trip } from '@uniride/core';
import { useAsyncData } from './useAsyncData';

export function useActiveTrips(institutionId?: string | null) {
  const result = useAsyncData<Trip[]>(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from('trips')
      .select('*, routes!inner(institution_id)')
      .in('status', ['driver_waiting', 'in_transit'])
      .order('scheduled_at', { ascending: false })
      .limit(50);

    if (institutionId) {
      query = query.eq('routes.institution_id', institutionId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as Trip[]) || [];
  }, []);

  const fetchTrips = useCallback(async () => {
    await result.execute();
  }, [result]);

  return {
    trips: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.execute,
  };
}
