import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineCache } from './offlineCache';

const mockGet = vi.mocked(AsyncStorage.getItem);
const mockSet = vi.mocked(AsyncStorage.setItem);
const mockRemove = vi.mocked(AsyncStorage.removeItem);

const uuid = '123e4567-e89b-12d3-a456-426614174000';
const uuid2 = '223e4567-e89b-12d3-a456-426614174001';

describe('OfflineCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── saveActiveSubscription ──────────────────────────────────────────────────

  describe('saveActiveSubscription', () => {
    it('saves subscription to AsyncStorage', async () => {
      mockSet.mockResolvedValue(undefined);

      const sub = {
        id: uuid,
        student_id: uuid2,
        route_id: uuid,
        status: 'active' as const,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 30).toISOString(),
        created_at: new Date().toISOString(),
      };

      await OfflineCache.saveActiveSubscription(sub);

      expect(mockSet).toHaveBeenCalledOnce();
      const [key, value] = mockSet.mock.calls[0];
      expect(key).toBe('@uniride_active_subscription');
      const parsed = JSON.parse(value as string);
      expect(parsed.data.id).toBe(uuid);
      expect(parsed.cachedAt).toBeTruthy();
    });

    it('removes entry when null is passed', async () => {
      mockRemove.mockResolvedValue(undefined);

      await OfflineCache.saveActiveSubscription(null);

      expect(mockRemove).toHaveBeenCalledWith('@uniride_active_subscription');
      expect(mockSet).not.toHaveBeenCalled();
    });
  });

  // ── getActiveSubscription ───────────────────────────────────────────────────

  describe('getActiveSubscription', () => {
    it('returns null when nothing cached', async () => {
      mockGet.mockResolvedValue(null);

      const result = await OfflineCache.getActiveSubscription();
      expect(result).toBeNull();
    });

    it('returns valid non-expired subscription', async () => {
      const sub = {
        id: uuid,
        student_id: uuid2,
        route_id: uuid,
        status: 'active' as const,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days future
        created_at: new Date().toISOString(),
      };

      mockGet.mockResolvedValue(
        JSON.stringify({
          data: sub,
          cachedAt: new Date().toISOString(),
        }),
      );

      const result = await OfflineCache.getActiveSubscription();
      expect(result).not.toBeNull();
      expect(result?.id).toBe(uuid);
    });

    it('returns null and removes cache for expired subscription', async () => {
      mockRemove.mockResolvedValue(undefined);

      const expiredSub = {
        id: uuid,
        student_id: uuid2,
        route_id: uuid,
        status: 'active' as const,
        start_date: new Date(Date.now() - 86400000 * 60).toISOString(),
        end_date: new Date(Date.now() - 86400000).toISOString(), // yesterday
        created_at: new Date().toISOString(),
      };

      mockGet.mockResolvedValue(
        JSON.stringify({
          data: expiredSub,
          cachedAt: new Date().toISOString(),
        }),
      );

      const result = await OfflineCache.getActiveSubscription();
      expect(result).toBeNull();
      expect(mockRemove).toHaveBeenCalledWith('@uniride_active_subscription');
    });

    it('returns null on malformed JSON', async () => {
      mockGet.mockResolvedValue('not-valid-json{{{');

      const result = await OfflineCache.getActiveSubscription();
      expect(result).toBeNull();
    });
  });

  // ── clear ───────────────────────────────────────────────────────────────────

  describe('clear', () => {
    it('removes the cache key', async () => {
      mockRemove.mockResolvedValue(undefined);

      await OfflineCache.clear();

      expect(mockRemove).toHaveBeenCalledWith('@uniride_active_subscription');
    });
  });
});
