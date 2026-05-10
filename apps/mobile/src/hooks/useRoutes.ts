import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Route } from '@uniride/core';

const PAGE_SIZE = 20;

export function useRoutes(page = 0) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchRoutes = useCallback(async () => {
    try {
      setIsLoading(true);
      const from = page * PAGE_SIZE;
      const { data, error, count } = await supabase
        .from('routes')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .gt('available_seats', 0)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      const newRoutes = data || [];
      setRoutes(page === 0 ? newRoutes : (prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const unique = newRoutes.filter((r) => !existingIds.has(r.id));
        return [...prev, ...unique];
      });
      setHasMore(newRoutes.length === PAGE_SIZE && (!count || from + PAGE_SIZE < count));
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Failed to fetch routes';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

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

  useEffect(() => {
    if (!routeId) {
      setIsLoading(false);
      return;
    }

    async function fetchRoute() {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('routes')
          .select('*')
          .eq('id', routeId)
          .single();

        if (error) throw error;
        setRoute(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Failed to fetch route';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRoute();

    const channel = supabase
      .channel(`route-${routeId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'routes', filter: `id=eq.${routeId}` },
        (payload) => setRoute(payload.new as Route)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [routeId]);

  return { route, isLoading, error };
}