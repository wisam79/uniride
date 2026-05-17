import * as SecureStore from 'expo-secure-store';
import { Subscription } from '@uniride/core';

const CACHE_KEY = 'uniride_active_subscription';

export const OfflineCache = {
  /**
   * Save the active subscription locally to allow offline verification.
   */
  async saveActiveSubscription(subscription: Subscription | null): Promise<void> {
    try {
      if (subscription) {
        // Save the raw subscription data + a timestamp to prevent stale reads
        const payload = {
          data: subscription,
          cachedAt: new Date().toISOString(),
        };
        await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(payload), {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
        });
      } else {
        await SecureStore.deleteItemAsync(CACHE_KEY);
      }
    } catch (e) {
      console.warn('Failed to save subscription to secure cache', e);
    }
  },

  /**
   * Retrieve the locally cached active subscription if internet is down.
   */
  async getActiveSubscription(): Promise<Subscription | null> {
    try {
      const raw = await SecureStore.getItemAsync(CACHE_KEY);
      if (!raw) return null;

      const payload = JSON.parse(raw);
      const sub: Subscription = payload.data;

      // Basic verification: Is it expired?
      const endDate = new Date(sub.end_date);
      if (endDate < new Date()) {
        await SecureStore.deleteItemAsync(CACHE_KEY);
        return null;
      }

      return sub;
    } catch (e) {
      console.warn('Failed to retrieve subscription from secure cache', e);
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
      console.warn('Failed to clear secure cache', e);
    }
  },
};
