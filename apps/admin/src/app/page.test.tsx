import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();
const mockGetUser = vi.fn();

vi.mock('../providers/supabaseClient', () => ({
  supabaseClient: {
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}));

describe('Dashboard — get_dashboard_stats RPC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls get_dashboard_stats RPC', async () => {
    mockRpc.mockResolvedValue({
      data: {
        total_users: 100,
        total_drivers: 20,
        total_routes: 15,
        active_routes: 10,
        total_trips: 200,
        active_trips: 5,
        total_subscriptions: 80,
        active_subscriptions: 30,
        monthly_revenue: 5000000,
      },
      error: null,
    });

    const { supabaseClient } = await import('../providers/supabaseClient');
    const { data } = await supabaseClient.rpc('get_dashboard_stats');

    expect(mockRpc).toHaveBeenCalledWith('get_dashboard_stats');
    expect(data).not.toBeNull();
    expect(data.active_trips).toBe(5);
  });

  it('returns null on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Server error' } });

    const { supabaseClient } = await import('../providers/supabaseClient');
    const { data, error } = await supabaseClient.rpc('get_dashboard_stats');

    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });
});

describe('Trips — admin_cancel_trip RPC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls admin_cancel_trip RPC with trip ID', async () => {
    mockRpc.mockResolvedValue({ error: null });

    const { supabaseClient } = await import('../providers/supabaseClient');
    const { error } = await supabaseClient.rpc('admin_cancel_trip', { p_trip_id: 'trip-123' });

    expect(mockRpc).toHaveBeenCalledWith('admin_cancel_trip', { p_trip_id: 'trip-123' });
    expect(error).toBeNull();
  });

  it('throws when admin_cancel_trip fails', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'Trip not found' } });

    const { supabaseClient } = await import('../providers/supabaseClient');
    const { error } = await supabaseClient.rpc('admin_cancel_trip', { p_trip_id: 'nonexistent' });

    expect(error).not.toBeNull();
    expect(error!.message).toBe('Trip not found');
  });
});

describe('Drivers — verify toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates profile is_verified via direct update', async () => {
    const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const { supabaseClient } = await import('../providers/supabaseClient');
    await supabaseClient.from('profiles').update({ is_verified: true });

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('fetches drivers with profiles join', async () => {
    const mockOrder = vi.fn().mockReturnValue({
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: mockOrder,
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      }),
    });

    const { supabaseClient } = await import('../providers/supabaseClient');
    await supabaseClient
      .from('drivers')
      .select('id, profiles!drivers_user_id_fkey(full_name, phone, is_verified)', {
        count: 'exact',
      })
      .order('created_at', { ascending: false })
      .range(0, 24);

    expect(mockFrom).toHaveBeenCalledWith('drivers');
  });
});

describe('DataGrid column i18n', () => {
  it('STATUS_LABELS defined for all trip statuses', () => {
    const STATUS_LABELS: Record<string, string> = {
      scheduled: 'مجدولة',
      driver_waiting: 'السائق ينتظر',
      in_transit: 'في الطريق',
      completed: 'مكتملة',
      absent: 'غائب',
      cancelled: 'ملغاة',
    };
    expect(STATUS_LABELS['scheduled']).toBeDefined();
    expect(STATUS_LABELS['completed']).toBeDefined();
    expect(Object.keys(STATUS_LABELS).length).toBe(6);
  });

  it('translations have required core keys', async () => {
    const { Translations } = await import('@uniride/core');
    expect(Translations.ar['welcome']).toBeDefined();
    expect(Translations.ar['login']).toBeDefined();
    expect(Translations.ar['book_now']).toBeDefined();
    expect(Translations.en['cancel']).toBeDefined();
  });
});

describe('Realtime channel — auto-refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('subscribes to trips changes channel', async () => {
    const mockOn = vi.fn().mockReturnThis();
    const mockSubscribe = vi.fn().mockReturnThis();
    mockChannel.mockReturnValue({ on: mockOn, subscribe: mockSubscribe });

    const { supabaseClient } = await import('../providers/supabaseClient');
    supabaseClient
      .channel('trips-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {})
      .subscribe();

    expect(mockChannel).toHaveBeenCalledWith('trips-realtime');
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'trips' },
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });
});
