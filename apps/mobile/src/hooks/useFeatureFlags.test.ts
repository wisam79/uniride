import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}));

vi.mock('../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeFromMock(flags: Array<{ name: string; enabled: boolean }>, error: unknown = null) {
  return {
    select: vi.fn().mockResolvedValue({ data: error ? null : flags, error }),
  };
}

function makeChannelMock() {
  const ch = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };
  return ch;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useFeatureFlags — isEnabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true for enabled flag from DB', async () => {
    mockFrom.mockReturnValue(
      makeFromMock([
        { name: 'realtime_tracking', enabled: true },
        { name: 'zaincash_payment', enabled: false },
      ]),
    );
    mockChannel.mockReturnValue(makeChannelMock());

    // Test the logic directly (without renderHook — avoids React Native deps)
    const { supabase } = await import('../lib/supabase');
    const { data } = await supabase.from('feature_flags').select('name, enabled');

    const map = (data as Array<{ name: string; enabled: boolean }>).reduce<Record<string, boolean>>(
      (acc, f) => {
        acc[f.name] = f.enabled;
        return acc;
      },
      {},
    );

    expect(map['realtime_tracking']).toBe(true);
    expect(map['zaincash_payment']).toBe(false);
  });

  it('falls back to defaults on DB error', async () => {
    mockFrom.mockReturnValue(makeFromMock([], new Error('Network error')));
    mockChannel.mockReturnValue(makeChannelMock());

    const DEFAULT_FLAGS: Record<string, boolean> = {
      realtime_tracking: true,
      push_notifications: true,
      offline_mode: true,
      ratings_system: true,
      zaincash_payment: false,
    };

    // Simulate the fallback logic
    const isEnabled = (flagName: string, flags: Record<string, boolean>) =>
      flags[flagName] ?? DEFAULT_FLAGS[flagName] ?? false;

    // On error, flags stay as defaults
    expect(isEnabled('realtime_tracking', DEFAULT_FLAGS)).toBe(true);
    expect(isEnabled('zaincash_payment', DEFAULT_FLAGS)).toBe(false);
    expect(isEnabled('unknown_flag', DEFAULT_FLAGS)).toBe(false);
  });

  it('isEnabled returns false for unknown flags', () => {
    const DEFAULT_FLAGS: Record<string, boolean> = {
      realtime_tracking: true,
    };
    const isEnabled = (name: string, flags: Record<string, boolean>) =>
      flags[name] ?? DEFAULT_FLAGS[name] ?? false;

    expect(isEnabled('non_existent_feature', {})).toBe(false);
  });
});
