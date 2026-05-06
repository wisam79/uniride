import { beforeAll, afterAll, afterEach } from 'vitest';

// Global test setup for database connections
beforeAll(async () => {
  console.log('🔧 Setting up test environment...');
  console.log('✅ Using mocked Supabase client for unit tests');
});

afterEach(async () => {
  console.log('🧹 Test cleanup completed');
});

afterAll(async () => {
  console.log('👋 Test suite finished');
});

// Mock Supabase client for tests
export const mockSupabaseClient = {
  from: (table: string) => ({
    select: () => ({
      eq: () => Promise.resolve({ data: [], error: null }),
      neq: () => Promise.resolve({ data: [], error: null }),
      gt: () => Promise.resolve({ data: [], error: null }),
      lt: () => Promise.resolve({ data: [], error: null }),
    }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
  }),
  rpc: () => Promise.resolve({ data: null, error: null }),
  channel: () => ({
    on: () => ({
      subscribe: () => Promise.resolve({ status: 'SUBSCRIBED' }),
    }),
  }),
};

// Helper functions for tests
export const createTestUser = async (overrides = {}) => ({
  id: `test-user-${Date.now()}`,
  email: `test${Date.now()}@uniride.iq`,
  role: 'student',
  ...overrides,
});

export const createTestDriver = async (overrides = {}) => ({
  id: `test-driver-${Date.now()}`,
  user_id: `test-user-${Date.now()}`,
  capacity: 4,
  available_seats: 4,
  monthly_fee: 90000,
  commission_rate: 15,
  vehicle_info: 'Toyota Corolla',
  is_available: true,
  ...overrides,
});

export const createTestSubscription = async (overrides = {}) => ({
  id: `test-sub-${Date.now()}`,
  status: 'active',
  student_id: 'student-1',
  driver_id: 'driver-1',
  monthly_fee: 90000,
  commission_rate: 15,
  commission_amount: 13500,
  driver_payout: 76500,
  start_date: new Date().toISOString(),
  end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});

export const createMockAppSettings = () => ({
  default_commission_rate: "15",
  cancellation_fee_percent: "25",
  absence_daily_deduction_percent: "5",
  tracking_interval_minutes: "5",
});
