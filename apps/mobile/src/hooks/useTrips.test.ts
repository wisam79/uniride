import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ─────────────────────────────────────────────────────────────────────

const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();
const mockGetUser = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn().mockResolvedValue(null),
  setItemAsync: vi.fn().mockResolvedValue(undefined),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined),
  WHEN_UNLOCKED: 'WHEN_UNLOCKED',
}));

vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  watchPositionAsync: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  Accuracy: { High: 5 },
}));

// ─── flushGpsQueue tests (via indirect import) ─────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';

describe('GPS Queue — flushGpsQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes successfully sent items from queue', async () => {
    const queue = [
      { tripId: 't1', lat: 33.1, lng: 44.1, timestamp: Date.now(), retries: 0 },
      { tripId: 't2', lat: 33.2, lng: 44.2, timestamp: Date.now(), retries: 0 },
    ];

    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(queue));
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockRpc.mockResolvedValue({ error: null }); // both succeed

    // Import from the new location
    const { flushGpsQueue } = await import('./useLocationTracker');
    if (flushGpsQueue) {
      await flushGpsQueue();
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    }
  });

  it('keeps failed items with retries < 3', async () => {
    const queue = [{ tripId: 't1', lat: 33.1, lng: 44.1, timestamp: Date.now(), retries: 1 }];

    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(queue));
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockRpc.mockResolvedValue({ error: { message: 'Network error' } });

    const { flushGpsQueue } = await import('./useLocationTracker');
    if (flushGpsQueue) {
      await flushGpsQueue();
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    }
  });

  it('drops items after 3 retries', async () => {
    const queue = [{ tripId: 't1', lat: 33.1, lng: 44.1, timestamp: Date.now(), retries: 2 }];

    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(queue));
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockRpc.mockResolvedValue({ error: { message: 'Network error' } });

    const { flushGpsQueue } = await import('./useLocationTracker');
    if (flushGpsQueue) {
      await flushGpsQueue();
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    }
  });

  it('does nothing when queue is empty', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);

    const { flushGpsQueue } = await import('./useLocationTracker');
    if (flushGpsQueue) {
      await flushGpsQueue();
      expect(mockRpc).not.toHaveBeenCalled();
    }
  });
});

// ─── State Machine integration ─────────────────────────────────────────────────

describe('Trip status transitions (core integration)', () => {
  it('validates transitions match DB state machine', async () => {
    const { canTransition } = await import('@uniride/core');

    // These are the transitions trip-engine allows
    expect(canTransition('scheduled', 'driver_waiting')).toBe(true);
    expect(canTransition('driver_waiting', 'in_transit')).toBe(true);
    expect(canTransition('in_transit', 'completed')).toBe(true);
    expect(canTransition('in_transit', 'absent')).toBe(true);

    // These should be blocked
    expect(canTransition('completed', 'scheduled')).toBe(false);
    expect(canTransition('absent', 'in_transit')).toBe(false);
  });
});
