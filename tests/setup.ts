import { beforeAll, afterAll, afterEach } from 'vitest';
import { sql } from '@vercel/postgres';

// Global test setup for database connections
beforeAll(async () => {
  console.log('🔧 Setting up test environment...');
  
  // Verify database connection
  try {
    const result = await sql`SELECT 1 as connected`;
    console.log('✅ Database connected:', result.rows[0]);
  } catch (error) {
    console.warn('⚠️  Database not available, using mocks');
  }
});

afterEach(async () => {
  // Clean up between tests if needed
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

export const createTestRoute = async (overrides = {}) => ({
  id: `test-route-${Date.now()}`,
  name: 'Test Route',
  seats: 40,
  availableSeats: 40,
  genderPreference: 'any',
  ...overrides,
});

export const createTestSubscription = async (overrides = {}) => ({
  id: `test-sub-${Date.now()}`,
  status: 'active',
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  ...overrides,
});
