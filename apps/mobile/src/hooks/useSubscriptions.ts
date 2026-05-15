import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { Subscription } from '@uniride/core';
import { OfflineCache } from '../lib/offlineCache';
import { useAsyncData } from './useAsyncData';

interface SubscriptionWithRoute extends Subscription {
  routes: {
    id: string;
    title: string;
    start_location: string;
    end_location: string;
    price: number;
  } | null;
}

function fetchSubscriptionsPage(page: number): Promise<SubscriptionWithRoute[]> {
  return (async () => {
    const from = page * 20;
    const { data, error, count } = await supabase
      .from('subscriptions')
      .select('*, routes(*)', { count: 'exact' })
      .eq('student_id', (await supabase.auth.getUser()).data.user?.id ?? '')
      .order('created_at', { ascending: false })
      .range(from, from + 20 - 1);

    if (error) throw error;
    return (data as SubscriptionWithRoute[]) || [];
  })();
}

export function useSubscriptions(page = 0) {
  const fetcher = useCallback(
    async (p: number) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const offlineSub = await OfflineCache.getActiveSubscription();
        if (offlineSub) return [offlineSub as SubscriptionWithRoute];
        return [];
      }

      const from = p * 20;
      const { data, error, count } = await supabase
        .from('subscriptions')
        .select('*, routes(*)', { count: 'exact' })
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, from + 20 - 1);

      if (error) throw error;
      const newSubs = (data as SubscriptionWithRoute[]) || [];

      if (p === 0) {
        const activeSub = newSubs.find((s) => s.status === 'active');
        await OfflineCache.saveActiveSubscription(activeSub || null);
      }

      return newSubs;
    },
    [page],
  );

  const result = useAsyncData<SubscriptionWithRoute[]>(() => fetcher(page), []);

  const cancelSubscription = useCallback(
    async (subscriptionId: string) => {
      const snapshot = [...result.data];
      result.setIsLoading(true);

      result.setData((prev) =>
        prev.map((s) => (s.id === subscriptionId ? { ...s, status: 'cancelled' as const } : s)),
      );

      const timeoutId = setTimeout(() => {
        result.setData(snapshot);
        result.setError('انتهت مهلة الاستجابة');
        result.setIsLoading(false);
      }, 30000);

      try {
        const { error: rpcError } = await supabase.rpc('cancel_subscription', {
          p_subscription_id: subscriptionId,
        });
        clearTimeout(timeoutId);

        if (rpcError) {
          result.setData(snapshot);
          result.setError(rpcError.message);
        } else {
          result.execute();
        }
      } catch (err) {
        clearTimeout(timeoutId);
        result.setData(snapshot);
        result.setError(err instanceof Error ? err.message : String(err));
      } finally {
        result.setIsLoading(false);
      }
    },
    [result],
  );

  return {
    subscriptions: result.data,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.execute,
    hasMore: true,
    isPending: result.isLoading,
    cancelSubscription,
  };
}
