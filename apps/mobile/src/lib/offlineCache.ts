import * as SecureStore from 'expo-secure-store';
import { Subscription } from '@uniride/core';
import { logger } from './logger';

const CACHE_KEY = '@uniride_active_subscription';
const MAX_PAYLOAD_BYTES = 2048;

export const OfflineCache = {
  /**
   * Save the active subscription locally using encrypted SecureStore.
   * The payload is encrypted by the platform's native Keychain/Keystore.
   */
  async saveActiveSubscription(subscription: Subscription | null): Promise<void> {
    try {
      if (!subscription) {
        await SecureStore.deleteItemAsync(CACHE_KEY);
        return;
      }

      const payload = JSON.stringify({
        data: subscription,
        cachedAt: new Date().toISOString(),
      });

      // Enforce max payload size
      if (new TextEncoder().encode(payload).length > MAX_PAYLOAD_BYTES) {
        logger.warn('Subscription payload exceeds 2048 bytes, skipping secure cache');
        return;
      }

      await SecureStore.setItemAsync(CACHE_KEY, payload, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
    } catch (e) {
      logger.warn('Failed to save subscription to secure cache', {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  /**
   * Retrieve the locally cached active subscription if internet is down.
   */
  async getActiveSubscription(): Promise<Subscription | null> {
    try {
      const raw = await SecureStore.getItemAsync(CACHE_KEY);
      if (!raw) return null;

      let payload: { data: Subscription; cachedAt: string };
      try {
        payload = JSON.parse(raw) as { data: Subscription; cachedAt: string };
      } catch {
        // Corrupted data — delete and return null
        await SecureStore.deleteItemAsync(CACHE_KEY);
        return null;
      }

      const sub: Subscription = payload.data;

      // Expiry check (preserved from original)
      const endDate = new Date(sub.end_date);
      if (endDate < new Date()) {
        await SecureStore.deleteItemAsync(CACHE_KEY);
        return null;
      }

      return sub;
    } catch (e) {
      logger.warn('Failed to retrieve subscription from secure cache', {
        error: e instanceof Error ? e.message : String(e),
      });
      return null;
    }
  },

  /**
   * Clear cache (e.g. on logout)
   */
  async clear(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(CACHE_KEY);
    } catch (e) {
      logger.warn('Failed to clear secure cache', {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },
};
