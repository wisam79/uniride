import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkConnection() {
      try {
        const { data, error } = await supabase.rpc('ping');
        if (mounted) setIsOnline(!error && data === true);
      } catch {
        if (mounted) setIsOnline(false);
      }
    }

    checkConnection();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkConnection();
    });

    const interval = setInterval(checkConnection, 30000);

    return () => {
      mounted = false;
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  return { isOnline };
}

export function useOptimisticAction<T>(
  realAction: () => Promise<{ data: T | null; error: Error | null }>,
  optimisticUpdate: () => void,
  rollback: () => void
) {
  const [isProcessing, setIsProcessing] = useState(false);

  const execute = useCallback(async () => {
    setIsProcessing(true);
    optimisticUpdate();

    try {
      const result = await realAction();
      if (result.error) {
        rollback();
        return { data: null, error: result.error };
      }
      return { data: result.data, error: null };
    } catch (err) {
      rollback();
      return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
    } finally {
      setIsProcessing(false);
    }
  }, [realAction, optimisticUpdate, rollback]);

  return { execute, isProcessing };
}
