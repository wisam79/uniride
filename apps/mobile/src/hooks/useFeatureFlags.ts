import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { useAuthStore } from './useStore';

interface FeatureFlag {
  name: string;
  enabled: boolean;
}

// Default flags — used before DB loads or on error
const DEFAULT_FLAGS: Record<string, boolean> = {
  realtime_tracking: true,
  push_notifications: true,
  offline_mode: true,
  ratings_system: true,
  zaincash_payment: false,
};

let cachedFlags: Record<string, boolean> | null = null;

/** Call this on logout to clear the module-level cache */
export function clearFeatureFlagsCache() {
  cachedFlags = null;
}

export function useFeatureFlags() {
  const { user } = useAuthStore();
  const [flags, setFlags] = useState<Record<string, boolean>>(cachedFlags ?? DEFAULT_FLAGS);
  const [isLoading, setIsLoading] = useState(!cachedFlags);

  // ✅ REQ-016: مسح الـ cache عند تسجيل الخروج
  useEffect(() => {
    if (!user) {
      cachedFlags = null;
      setFlags(DEFAULT_FLAGS);
    }
  }, [user]);

  const fetchFlags = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('feature_flags').select('name, enabled');

      if (error) throw error;

      const map = (data as FeatureFlag[]).reduce<Record<string, boolean>>((acc, f) => {
        acc[f.name] = f.enabled;
        return acc;
      }, {});

      cachedFlags = map;
      setFlags(map);
      logger.info('Feature flags loaded', { count: data.length });
    } catch (err: unknown) {
      logger.warn('Failed to fetch feature flags — using defaults', {
        error: err instanceof Error ? err.message : String(err),
      });
      // Keep defaults on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();

    // Live updates — admin can toggle flags without app restart
    const channel = supabase
      .channel('feature-flags-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feature_flags' }, () => {
        logger.info('Feature flags changed — reloading');
        fetchFlags();
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.warn('[Realtime] feature-flags channel error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFlags]);

  const isEnabled = useCallback(
    (flagName: string): boolean => flags[flagName] ?? DEFAULT_FLAGS[flagName] ?? false,
    [flags],
  );

  return { flags, isEnabled, isLoading };
}
