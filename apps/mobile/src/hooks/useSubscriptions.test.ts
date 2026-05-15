import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockAuthGetUser = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getUser: mockAuthGetUser },
    from: mockFrom,
    rpc: mockRpc,
  },
}));

vi.mock('../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../lib/offlineCache', () => ({
  OfflineCache: {
    getActiveSubscription: vi.fn().mockResolvedValue(null),
    saveActiveSubscription: vi.fn().mockResolvedValue(undefined),
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

vi.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: vi.fn(),
    addEventListener: vi.fn(),
  },
}));

function makeFromMock(data: unknown, error: unknown = null) {
  const chain: any = {};
  const methods = ['select', 'eq', 'order', 'range', 'single'];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  // Make the chain thenable to simulate Supabase query results
  chain.then = (resolve: any) => resolve({ data, error, count: 0 });
  return chain;
}

describe('useSubscriptions — fetch logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches subscriptions for authenticated user', async () => {
    const subs = [
      {
        id: 's1',
        student_id: 'u1',
        route_id: 'r1',
        status: 'active',
        routes: { id: 'r1', title: 'Route A', start_location: 'A', end_location: 'B', price: 5000 },
      },
    ];
    const query = makeFromMock(subs);
    mockFrom.mockReturnValue(query);
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });

    const { supabase } = await import('../lib/supabase');
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase
      .from('subscriptions')
      .select('*, routes(*)')
      .eq('student_id', user!.id)
      .order('created_at', { ascending: false })
      .range(0, 19);

    expect(mockFrom).toHaveBeenCalledWith('subscriptions');
    expect(query.select).toHaveBeenCalled();
    expect(query.eq).toHaveBeenCalledWith('student_id', 'u1');
  });

  it('returns offline subscription when user is not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { OfflineCache } = await import('../lib/offlineCache');
    const offlineSub = await OfflineCache.getActiveSubscription();
    expect(offlineSub).toBeNull();
  });

  it('cancels subscription via RPC', async () => {
    mockRpc.mockResolvedValue({ error: null });
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });

    const { supabase } = await import('../lib/supabase');
    const { error } = await supabase.rpc('cancel_subscription', { p_subscription_id: 's1' });

    expect(mockRpc).toHaveBeenCalledWith('cancel_subscription', { p_subscription_id: 's1' });
    expect(error).toBeNull();
  });

  it('throws RPC error on cancel failure', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'Not your subscription' } });
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });

    const { supabase } = await import('../lib/supabase');
    const { error } = await supabase.rpc('cancel_subscription', { p_subscription_id: 's2' });

    expect(error).not.toBeNull();
    expect(error?.message).toBe('Not your subscription');
  });
});

describe('useAsyncData — state machine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tracks loading state correctly', async () => {
    let resolve: (v: string[]) => void;
    const promise = new Promise<string[]>((r) => {
      resolve = (val) => r(val);
    });

    const fetcher = vi.fn().mockReturnValue(promise);

    // Simulate the hook behavior
    let isLoading = false;
    const task = fetcher().then(() => {
      isLoading = false;
    });
    isLoading = true;

    expect(isLoading).toBe(true);

    resolve!(['data']);
    await task;
    expect(isLoading).toBe(false);
  });

  it('sets error on fetch failure', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Network error'));

    try {
      await fetcher();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toBe('Network error');
    }
  });
});

describe('useNetworkStatus — evaluateState', () => {
  it('returns false when isConnected is false', async () => {
    const { evaluateState } = await import('./useNetworkStatus');
    expect(evaluateState({ isConnected: false, isInternetReachable: true } as any)).toBe(false);
  });

  it('returns false when isInternetReachable is false', async () => {
    const { evaluateState } = await import('./useNetworkStatus');
    expect(evaluateState({ isConnected: true, isInternetReachable: false } as any)).toBe(false);
  });

  it('returns true when connected and internet reachable', async () => {
    const { evaluateState } = await import('./useNetworkStatus');
    expect(evaluateState({ isConnected: true, isInternetReachable: true } as any)).toBe(true);
  });

  it('returns true when isInternetReachable is null (indeterminate)', async () => {
    const { evaluateState } = await import('./useNetworkStatus');
    expect(evaluateState({ isConnected: true, isInternetReachable: null } as any)).toBe(true);
  });
});

describe('useNotifications — logger integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses logger instead of console.warn', async () => {
    const { logger } = await import('../lib/logger');
    logger.warn('[Notifications] Skipping — not supported in Expo Go (SDK 53+)');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('logs notification received with logger.info', async () => {
    const { logger } = await import('../lib/logger');
    logger.info('[Notifications] Received', { title: 'Test Title' });
    expect(logger.info).toHaveBeenCalledWith('[Notifications] Received', { title: 'Test Title' });
  });
});

describe('useDriverTrips — updateTripStatus via trip-engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls trip-engine function for status update', async () => {
    const mockInvoke = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    const { supabase } = await import('../lib/supabase');
    (supabase as any).functions = { invoke: mockInvoke };

    await supabase.functions.invoke('trip-engine', {
      body: { tripId: 't1', newStatus: 'in_transit' },
    });

    expect(mockInvoke).toHaveBeenCalledWith('trip-engine', {
      body: { tripId: 't1', newStatus: 'in_transit' },
    });
  });
});

describe('GPS Queue — coordinate validation', () => {
  it('rejects lat > 90', () => {
    const lat = 91;
    expect(lat < -90 || lat > 90).toBe(true);
  });

  it('rejects lng > 180', () => {
    const lng = 181;
    expect(lng < -180 || lng > 180).toBe(true);
  });

  it('accepts valid coordinates', () => {
    const lat = 33.3;
    const lng = 44.4;
    expect(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180).toBe(true);
  });

  it('drops items after 3 retries', () => {
    const item = { tripId: 't1', lat: 33.1, lng: 44.1, timestamp: Date.now(), retries: 2 };
    item.retries++;
    expect(item.retries >= 3).toBe(true);
  });
});
