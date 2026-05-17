import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
  WHEN_UNLOCKED: 'WHEN_UNLOCKED',
}));

import * as SecureStore from 'expo-secure-store';
import { OfflineCache } from './offlineCache';

const mockGet = vi.mocked(SecureStore.getItemAsync);
const mockSet = vi.mocked(SecureStore.setItemAsync);
const mockDelete = vi.mocked(SecureStore.deleteItemAsync);

const uuid = '123e4567-e89b-12d3-a456-426614174000';
const uuid2 = '223e4567-e89b-12d3-a456-426614174001';

describe('OfflineCache', () => {
  let consoleWarnSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  // ── saveActiveSubscription ──────────────────────────────────────────────────

  describe('saveActiveSubscription', () => {
    it('saves subscription to SecureStore', async () => {
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
      const firstCall = mockSet.mock.calls[0];
      expect(firstCall).toBeDefined();
      const key = firstCall?.[0];
      const value = firstCall?.[1];
      expect(key).toBe('uniride_active_subscription');
      const parsed = JSON.parse(value as string);
      expect(parsed.data.id).toBe(uuid);
      expect(parsed.cachedAt).toBeTruthy();
    });

    it('deletes entry when null is passed', async () => {
      mockDelete.mockResolvedValue(undefined);

      await OfflineCache.saveActiveSubscription(null);

      expect(mockDelete).toHaveBeenCalledWith('uniride_active_subscription');
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
        end_date: new Date(Date.now() + 86400000 * 30).toISOString(),
        created_at: new Date().toISOString(),
      };

      mockGet.mockResolvedValue(JSON.stringify({ data: sub, cachedAt: new Date().toISOString() }));

      const result = await OfflineCache.getActiveSubscription();
      expect(result).not.toBeNull();
      expect(result?.id).toBe(uuid);
    });

    it('returns null and deletes cache for expired subscription', async () => {
      mockDelete.mockResolvedValue(undefined);

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
        JSON.stringify({ data: expiredSub, cachedAt: new Date().toISOString() }),
      );

      const result = await OfflineCache.getActiveSubscription();
      expect(result).toBeNull();
      expect(mockDelete).toHaveBeenCalledWith('uniride_active_subscription');
    });

    it('returns null and deletes on malformed JSON', async () => {
      mockDelete.mockResolvedValue(undefined);
      mockGet.mockResolvedValue('not-valid-json{{{');

      const result = await OfflineCache.getActiveSubscription();
      expect(result).toBeNull();
    });
  });

  // ── clear ───────────────────────────────────────────────────────────────────

  describe('clear', () => {
    it('deletes the cache key', async () => {
      mockDelete.mockResolvedValue(undefined);

      await OfflineCache.clear();

      expect(mockDelete).toHaveBeenCalledWith('uniride_active_subscription');
    });
  });

  // ── error handling ──────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('calls console.warn when setItem fails', async () => {
      const err = new Error('Storage full');
      mockSet.mockRejectedValue(err);

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

      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to save subscription to secure cache', err);
    });

    it('calls console.warn when getItem fails', async () => {
      const err = new Error('Read error');
      mockGet.mockRejectedValue(err);

      const result = await OfflineCache.getActiveSubscription();

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to retrieve subscription from secure cache', err);
    });

    it('calls console.warn when deleteItem fails on clear', async () => {
      const err = new Error('Remove error');
      mockDelete.mockRejectedValue(err);

      await OfflineCache.clear();

      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to clear secure cache', err);
    });
  });
});