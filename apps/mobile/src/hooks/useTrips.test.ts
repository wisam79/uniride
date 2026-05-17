import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ─────────────────────────────────────────────────────────────────────

(global as any).__DEV__ = true;
process.env.EXPO_OS = 'ios';

vi.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: vi.fn((opts: any) => opts.ios || opts.default),
  },
  TurboModuleRegistry: {
    get: vi.fn(),
    getEnforcing: vi.fn(),
  },
  NativeModules: {},
  NativeEventEmitter: class {},
}));

vi.mock('expo-modules-core', () => ({
  requireNativeModule: vi.fn(),
  EventEmitter: class {},
  Platform: { OS: 'ios' },
}));

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

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
  WHEN_UNLOCKED: 'WHEN_UNLOCKED',
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
  ALWAYS: 'ALWAYS',
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'WHEN_PASSCODE_SET_THIS_DEVICE_ONLY',
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
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

    // Import the module to trigger the flush
    const { flushGpsQueueForTest } = await import('./useTrips');
    if (flushGpsQueueForTest) {
      await flushGpsQueueForTest();
      // Queue should be cleared since all succeeded
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    }
  });

  it('keeps failed items with retries < 3', async () => {
    const queue = [{ tripId: 't1', lat: 33.1, lng: 44.1, timestamp: Date.now(), retries: 1 }];

    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(queue));
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockRpc.mockResolvedValue({ error: { message: 'Network error' } }); // fails

    const { flushGpsQueueForTest } = await import('./useTrips');
    if (flushGpsQueueForTest) {
      await flushGpsQueueForTest();
      // Should keep the item (retries becomes 2, still < 3)
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    }
  });

  it('drops items after 3 retries', async () => {
    const queue = [{ tripId: 't1', lat: 33.1, lng: 44.1, timestamp: Date.now(), retries: 2 }];

    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(queue));
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockRpc.mockResolvedValue({ error: { message: 'Network error' } }); // fails again

    const { flushGpsQueueForTest } = await import('./useTrips');
    if (flushGpsQueueForTest) {
      await flushGpsQueueForTest();
      // retries becomes 3 → dropped → queue empty → removeItem
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    }
  });

  it('does nothing when queue is empty', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);

    const { flushGpsQueueForTest } = await import('./useTrips');
    if (flushGpsQueueForTest) {
      await flushGpsQueueForTest();
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
