import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock @refinedev/supabase ──────────────────────────────────────────────────
const mockBase = {
  getList: vi.fn(),
  getMany: vi.fn(),
  getOne: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteOne: vi.fn(),
  getApiUrl: vi.fn(() => 'https://example.supabase.co'),
  custom: undefined,
};

vi.mock('@refinedev/supabase', () => ({
  dataProvider: () => mockBase,
}));

vi.mock('./supabaseClient', () => ({
  supabaseClient: {},
}));

// Import AFTER mocks
const { dataProvider } = await import('./dataProvider');

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('dataProvider — snake_case → camelCase (getList)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('converts snake_case keys to camelCase in getList', async () => {
    mockBase.getList.mockResolvedValue({
      data: [
        {
          id: '1',
          route_id: 'r1',
          scheduled_at: '2026-01-01T00:00:00Z',
          started_at: null,
          ended_at: null,
          last_lat: 33.3,
          last_lng: 44.4,
          driver_id: 'd1',
        },
      ],
      total: 1,
    });

    const result = await dataProvider.getList({
      resource: 'trips',
      pagination: { current: 1, pageSize: 10 },
    });

    expect(result.data[0]).toMatchObject({
      id: '1',
      routeId: 'r1',
      scheduledAt: '2026-01-01T00:00:00Z',
      startedAt: null,
      endedAt: null,
      lastLat: 33.3,
      lastLng: 44.4,
      driverId: 'd1',
    });
  });

  it('converts nested objects recursively', async () => {
    mockBase.getList.mockResolvedValue({
      data: [
        {
          id: '1',
          student_id: 's1',
          route_id: 'r1',
          start_date: '2026-01-01',
          end_date: '2026-06-01',
        },
      ],
      total: 1,
    });

    const result = await dataProvider.getList({
      resource: 'subscriptions',
      pagination: { current: 1, pageSize: 10 },
    });

    expect(result.data[0]).toMatchObject({
      studentId: 's1',
      routeId: 'r1',
      startDate: '2026-01-01',
      endDate: '2026-06-01',
    });
  });
});

describe('dataProvider — camelCase → snake_case (create/update)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('converts camelCase variables to snake_case on create', async () => {
    mockBase.create.mockResolvedValue({
      data: { id: '1', route_id: 'r1', driver_id: 'd1' },
    });

    await dataProvider.create({
      resource: 'trips',
      variables: {
        routeId: 'r1',
        driverId: 'd1',
        scheduledAt: '2026-01-01T00:00:00Z',
      },
    });

    expect(mockBase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          route_id: 'r1',
          driver_id: 'd1',
          scheduled_at: '2026-01-01T00:00:00Z',
        }),
      }),
    );
  });

  it('converts camelCase variables to snake_case on update', async () => {
    mockBase.update.mockResolvedValue({
      data: { id: '1', is_active: false },
    });

    await dataProvider.update({
      resource: 'routes',
      id: '1',
      variables: { isActive: false, availableSeats: 10 },
    });

    expect(mockBase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          is_active: false,
          available_seats: 10,
        }),
      }),
    );
  });
});

describe('dataProvider — getOne', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('converts snake_case to camelCase in getOne', async () => {
    mockBase.getOne.mockResolvedValue({
      data: {
        id: '1',
        full_name: 'Ahmed Ali',
        is_verified: true,
        institution_id: 'inst1',
        created_at: '2026-01-01',
      },
    });

    const result = await dataProvider.getOne({ resource: 'profiles', id: '1' });

    expect(result.data).toMatchObject({
      fullName: 'Ahmed Ali',
      isVerified: true,
      institutionId: 'inst1',
      createdAt: '2026-01-01',
    });
  });
});
