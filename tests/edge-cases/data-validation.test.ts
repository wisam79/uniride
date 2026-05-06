import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const RouteSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(100), // Max 100 characters
  seats: z.number().int().min(1).max(60),
  price: z.number().positive(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

describe('Edge Cases - Data Validation', () => {
  it('should reject route names exceeding max length', () => {
    const longName = 'A'.repeat(101);
    const route = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: longName,
      seats: 4,
      price: 5000,
      latitude: 33.315,
      longitude: 44.366,
    };
    
    const result = RouteSchema.safeParse(route);
    expect(result.success).toBe(false);
  });

  it('should reject invalid geographical coordinates', () => {
    const invalidRoute = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Valid Name',
      seats: 4,
      price: 5000,
      latitude: 91, // Invalid: > 90
      longitude: 200, // Invalid: > 180
    };
    
    const result = RouteSchema.safeParse(invalidRoute);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.some(e => e.path.includes('latitude'))).toBe(true);
      expect(result.error.errors.some(e => e.path.includes('longitude'))).toBe(true);
    }
  });

  it('should simulate concurrency explicitly (double booking)', async () => {
    let availableSeats = 1;
    let lock = false;

    // Simulate an async booking process
    const bookSeat = async () => {
      if (lock) throw new Error('Resource locked');
      lock = true; // Acquire lock
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 10));
      
      if (availableSeats <= 0) {
        lock = false;
        throw new Error('No seats left');
      }
      availableSeats -= 1;
      lock = false; // Release lock
      return true;
    };

    // Fire two bookings simultaneously
    const results = await Promise.allSettled([bookSeat(), bookSeat()]);
    
    // One should succeed, one should fail (either lock or no seats)
    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');
    
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    expect(availableSeats).toBe(0);
  });
});
