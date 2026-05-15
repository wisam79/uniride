import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Trip } from '@uniride/core';
import { useAsyncData } from './useAsyncData';

const PAGE_SIZE = 20;

export interface TripHistoryItem extends Trip {
  created_at: string;
  routes: {
    title: string;
    start_location: string;
    end_location: string;
  } | null;
  driver: {
    full_name: string;
    phone: string;
  } | null;
}

export function useTripHistory(page = 0) {
  const result = useAsyncData<TripHistoryItem[]>(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const from = page * PAGE_SIZE;

    // We join trips via the subscriptions table because students don't have a direct 'student_id' on trips.
    // Wait, let's verify if students have a direct relation to trips.
    // The architecture says students subscribe to routes. Trips are created for routes.
    // A trip belongs to a route.
    // To get a student's history, we need to find trips for the routes they are subscribed to,
    // OR trips they were physically on.
    // Let's just fetch all trips for the routes the student is subscribed to.

    // First get user's active/expired subscriptions
    const { data: subs, error: subsError } = await supabase
      .from('subscriptions')
      .select('route_id')
      .eq('student_id', user.id);

    if (subsError) throw subsError;
    if (!subs || subs.length === 0) return [];

    const routeIds = subs.map((s) => s.route_id);

    const { data, error, count } = await supabase
      .from('trips')
      .select(
        '*, routes(title, start_location, end_location), drivers!inner(profiles!drivers_user_id_fkey(full_name, phone))',
        { count: 'exact' },
      )
      .in('route_id', routeIds)
      .in('status', ['completed', 'cancelled', 'absent'])
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const mapped = (data || []).map((row: any) => {
      const profileRow = Array.isArray(row.drivers?.profiles)
        ? row.drivers.profiles[0]
        : row.drivers?.profiles;

      const driver = profileRow
        ? { full_name: profileRow.full_name ?? '', phone: profileRow.phone ?? '' }
        : null;

      return { ...row, driver };
    });

    return mapped as TripHistoryItem[];
  }, []);

  return {
    trips: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.execute,
    hasMore: (result.data?.length ?? 0) === PAGE_SIZE,
    isPending: result.isLoading,
  };
}
