import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase first - module-level mock
vi.mock('../../artifacts/mobile/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      gt: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) },
  },
}));

describe('Mobile API Tests', () => {
  describe('estimateFare (pure function)', () => {
    it('should return the monthly fee as the fare estimate', async () => {
      const { api } = await import('../../artifacts/mobile/lib/api');
      expect(api.estimateFare(90000)).toBe(90000);
      expect(api.estimateFare(180000)).toBe(180000);
      expect(api.estimateFare(0)).toBe(0);
    });

    it('should handle any monthly fee value', async () => {
      const { api } = await import('../../artifacts/mobile/lib/api');
      expect(api.estimateFare(100000)).toBe(100000);
    });
  });
});