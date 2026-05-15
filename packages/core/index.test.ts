import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  canTransition,
  TripStatus,
  ValidTransitions,
  RouteSchema,
  RatingSchema,
  TripSchema,
  ProfileSchema,
  LicenseSchema,
  LicenseBatchSchema,
  SubscriptionSchema,
  GeoCoordinates,
  Translations,
  retryWithBackoff,
} from './index';

// ─── State Machine ─────────────────────────────────────────────────────────────

describe('canTransition', () => {
  it('allows scheduled → driver_waiting', () => {
    expect(canTransition('scheduled', 'driver_waiting')).toBe(true);
  });

  it('allows scheduled → cancelled', () => {
    expect(canTransition('scheduled', 'cancelled')).toBe(true);
  });

  it('allows driver_waiting → in_transit', () => {
    expect(canTransition('driver_waiting', 'in_transit')).toBe(true);
  });

  it('allows driver_waiting → cancelled', () => {
    expect(canTransition('driver_waiting', 'cancelled')).toBe(true);
  });

  it('allows in_transit → completed', () => {
    expect(canTransition('in_transit', 'completed')).toBe(true);
  });

  it('allows in_transit → absent', () => {
    expect(canTransition('in_transit', 'absent')).toBe(true);
  });

  it('rejects scheduled → completed (skip steps)', () => {
    expect(canTransition('scheduled', 'completed')).toBe(false);
  });

  it('rejects scheduled → in_transit (skip steps)', () => {
    expect(canTransition('scheduled', 'in_transit')).toBe(false);
  });

  it('rejects completed → any (terminal state)', () => {
    const statuses: TripStatus[] = [
      'scheduled',
      'driver_waiting',
      'in_transit',
      'absent',
      'cancelled',
    ];
    statuses.forEach((s) => {
      expect(canTransition('completed', s)).toBe(false);
    });
  });

  it('rejects absent → any (terminal state)', () => {
    const statuses: TripStatus[] = [
      'scheduled',
      'driver_waiting',
      'in_transit',
      'completed',
      'cancelled',
    ];
    statuses.forEach((s) => {
      expect(canTransition('absent', s)).toBe(false);
    });
  });

  it('rejects cancelled → any (terminal state)', () => {
    const statuses: TripStatus[] = [
      'scheduled',
      'driver_waiting',
      'in_transit',
      'completed',
      'absent',
    ];
    statuses.forEach((s) => {
      expect(canTransition('cancelled', s)).toBe(false);
    });
  });

  it('rejects unknown status gracefully', () => {
    expect(canTransition('unknown' as TripStatus, 'completed')).toBe(false);
  });
});

describe('ValidTransitions completeness', () => {
  it('covers all TripStatus values as keys', () => {
    const allStatuses: TripStatus[] = [
      'scheduled',
      'driver_waiting',
      'in_transit',
      'completed',
      'absent',
      'cancelled',
    ];
    allStatuses.forEach((s) => {
      expect(ValidTransitions).toHaveProperty(s);
      expect(Array.isArray(ValidTransitions[s])).toBe(true);
    });
  });
});

// ─── Zod Schemas ───────────────────────────────────────────────────────────────

const uuid = '123e4567-e89b-12d3-a456-426614174000';
const uuid2 = '223e4567-e89b-12d3-a456-426614174001';
const uuid3 = '323e4567-e89b-12d3-a456-426614174002';
const uuid4 = '423e4567-e89b-12d3-a456-426614174003';
const now = new Date().toISOString();

describe('RouteSchema', () => {
  const validRoute = {
    id: uuid,
    driver_id: uuid2,
    title: 'Baghdad → University',
    start_location: 'Baghdad',
    end_location: 'University of Baghdad',
    price: 5000,
    capacity: 20,
    available_seats: 15,
    is_active: true,
  };

  it('accepts a valid route', () => {
    expect(() => RouteSchema.parse(validRoute)).not.toThrow();
  });

  it('rejects negative price', () => {
    expect(() => RouteSchema.parse({ ...validRoute, price: -1 })).toThrow();
  });

  it('rejects zero capacity', () => {
    expect(() => RouteSchema.parse({ ...validRoute, capacity: 0 })).toThrow();
  });

  it('rejects empty title', () => {
    expect(() => RouteSchema.parse({ ...validRoute, title: '' })).toThrow();
  });
});

describe('RatingSchema', () => {
  const validRating = {
    id: uuid,
    trip_id: uuid2,
    student_id: uuid3,
    driver_id: uuid4,
    rating: 4,
    created_at: now,
  };

  it('accepts rating 1–5', () => {
    [1, 2, 3, 4, 5].forEach((r) => {
      expect(() => RatingSchema.parse({ ...validRating, rating: r })).not.toThrow();
    });
  });

  it('rejects rating 0', () => {
    expect(() => RatingSchema.parse({ ...validRating, rating: 0 })).toThrow();
  });

  it('rejects rating 6', () => {
    expect(() => RatingSchema.parse({ ...validRating, rating: 6 })).toThrow();
  });

  it('rejects non-integer rating', () => {
    expect(() => RatingSchema.parse({ ...validRating, rating: 3.5 })).toThrow();
  });
});

describe('GeoCoordinates', () => {
  it('accepts valid coordinates', () => {
    expect(() => GeoCoordinates.parse({ lat: 33.3152, lng: 44.3661 })).not.toThrow();
  });

  it('rejects lat > 90', () => {
    expect(() => GeoCoordinates.parse({ lat: 91, lng: 44 })).toThrow();
  });

  it('rejects lat < -90', () => {
    expect(() => GeoCoordinates.parse({ lat: -91, lng: 44 })).toThrow();
  });

  it('rejects lng > 180', () => {
    expect(() => GeoCoordinates.parse({ lat: 33, lng: 181 })).toThrow();
  });

  it('rejects lng < -180', () => {
    expect(() => GeoCoordinates.parse({ lat: 33, lng: -181 })).toThrow();
  });
});

describe('ProfileSchema', () => {
  const validProfile = {
    id: uuid,
    full_name: 'Ahmed Ali',
    phone: '07701234567',
    role: 'student' as const,
    institution_id: null,
    is_verified: false,
    created_at: now,
    updated_at: now,
  };

  it('accepts valid profile', () => {
    expect(() => ProfileSchema.parse(validProfile)).not.toThrow();
  });

  it('rejects invalid role', () => {
    expect(() => ProfileSchema.parse({ ...validProfile, role: 'superuser' })).toThrow();
  });

  it('rejects empty full_name', () => {
    expect(() => ProfileSchema.parse({ ...validProfile, full_name: '' })).toThrow();
  });
});

describe('LicenseSchema', () => {
  const validLicense = {
    id: uuid,
    batch_id: uuid2,
    route_id: uuid3,
    code: 'ABC123XYZ',
    status: 'active' as const,
    valid_days: 30,
    created_at: now,
  };

  it('accepts valid license', () => {
    expect(() => LicenseSchema.parse(validLicense)).not.toThrow();
  });

  it('rejects invalid status', () => {
    expect(() => LicenseSchema.parse({ ...validLicense, status: 'pending' })).toThrow();
  });

  it('rejects valid_days < 1', () => {
    expect(() => LicenseSchema.parse({ ...validLicense, valid_days: 0 })).toThrow();
  });
});

describe('SubscriptionSchema', () => {
  const validSub = {
    id: uuid,
    student_id: uuid2,
    route_id: uuid3,
    status: 'active' as const,
    start_date: now,
    end_date: now,
    created_at: now,
  };

  it('accepts valid subscription', () => {
    expect(() => SubscriptionSchema.parse(validSub)).not.toThrow();
  });

  it('rejects invalid status', () => {
    expect(() => SubscriptionSchema.parse({ ...validSub, status: 'unknown' })).toThrow();
  });
});

// ─── i18n ──────────────────────────────────────────────────────────────────────

describe('Translations', () => {
  it('has both ar and en', () => {
    expect(Translations).toHaveProperty('ar');
    expect(Translations).toHaveProperty('en');
  });

  it('ar and en have the same keys', () => {
    const arKeys = Object.keys(Translations.ar).sort();
    const enKeys = Object.keys(Translations.en).sort();
    expect(arKeys).toEqual(enKeys);
  });

  it('no empty translation values', () => {
    Object.entries(Translations.ar).forEach(([key, value]) => {
      expect(value, `ar.${key} is empty`).toBeTruthy();
    });
    Object.entries(Translations.en).forEach(([key, value]) => {
      expect(value, `en.${key} is empty`).toBeTruthy();
    });
  });
});

// ─── retryWithBackoff property tests ──────────────────────────────────────────
describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves immediately when fn succeeds on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await retryWithBackoff(fn, { maxRetries: 3, baseDelayMs: 0 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resolves after N failures then success (Property 1)', async () => {
    for (const failCount of [0, 1, 2, 3]) {
      let calls = 0;
      const fn = vi.fn().mockImplementation(() => {
        calls++;
        if (calls <= failCount) return Promise.reject(new Error(`fail ${calls}`));
        return Promise.resolve(`success after ${failCount}`);
      });

      const promise = retryWithBackoff(fn, { maxRetries: 3, baseDelayMs: 1 });
      // Advance timers to skip delays
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe(`success after ${failCount}`);
      expect(fn).toHaveBeenCalledTimes(failCount + 1);
      fn.mockReset();
    }
  });

  it('throws last error after exhaustion (Property 2)', async () => {
    let attempt = 0;
    const fn = vi.fn().mockImplementation(() => {
      attempt++;
      return Promise.reject(new Error(`error ${attempt}`));
    });

    // Run timers and await the rejection together
    const result = await Promise.all([
      expect(retryWithBackoff(fn, { maxRetries: 2, baseDelayMs: 1 })).rejects.toThrow('error 3'),
      vi.runAllTimersAsync(),
    ]);
    void result;
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('stops immediately when shouldRetry returns false (Property 3)', async () => {
    const specificError = new Error('non-retryable');
    const fn = vi.fn().mockRejectedValue(specificError);
    const shouldRetry = vi.fn().mockReturnValue(false);

    await expect(
      retryWithBackoff(fn, { maxRetries: 3, baseDelayMs: 1, shouldRetry }),
    ).rejects.toThrow('non-retryable');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledWith(specificError);
  });

  it('retries when shouldRetry returns true', async () => {
    let calls = 0;
    const fn = vi.fn().mockImplementation(() => {
      calls++;
      if (calls < 3) return Promise.reject(new Error('retry me'));
      return Promise.resolve('done');
    });

    const promise = retryWithBackoff(fn, {
      maxRetries: 3,
      baseDelayMs: 1,
      shouldRetry: () => true,
    });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('done');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
