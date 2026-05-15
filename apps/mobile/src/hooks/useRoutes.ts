import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Route } from '@uniride/core';
import { logger } from '../lib/logger';

const PAGE_SIZE = 20;

export function useRoutes(institutionId?: string | null, page = 0) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchRoutes = useCallback(async () => {
    try {
      setIsLoading(true);
      const from = page * PAGE_SIZE;

      let query = supabase
        .from('routes')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .gt('available_seats', 0)
        .order('created_at', { ascending: false });

      if (institutionId) {
        query = query.eq('institution_id', institutionId);
      }

      const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      const newRoutes = data || [];
      setRoutes(
        page === 0
          ? newRoutes
          : (prev) => {
              const existingIds = new Set(prev.map((r) => r.id));
              const unique = newRoutes.filter((r) => !existingIds.has(r.id));
              return [...prev, ...unique];
            },
      );
      setHasMore(newRoutes.length === PAGE_SIZE && (!count || from + PAGE_SIZE < count));
      setError(null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : 'Failed to fetch routes';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page, institutionId]);

  useEffect(() => {
    fetchRoutes();

    const channel = supabase
      .channel('routes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'routes' }, () => {
        fetchRoutes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRoutes]);

  return { routes, isLoading, error, refetch: fetchRoutes, hasMore };
}

export function useRouteById(routeId: string | null) {
  const [route, setRoute] = useState<Route | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoute = useCallback(async () => {
    if (!routeId) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from('routes').select('*').eq('id', routeId).single();

      if (error) throw error;
      setRoute(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : 'Failed to fetch route';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    fetchRoute();

    const channel = supabase
      .channel(`route-${routeId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'routes', filter: `id=eq.${routeId}` },
        () => {
          // ✅ Re-fetch كامل — لا ندمج payload.new مباشرة (قد يفقد بيانات)
          fetchRoute();
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.warn('[Realtime] route channel error, re-fetching...', { status });
          fetchRoute();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [routeId, fetchRoute]);

  return { route, isLoading, error, refetch: fetchRoute };
}
