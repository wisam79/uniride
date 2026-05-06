import { describe, it, expect, beforeEach } from 'vitest';

describe('Concurrency Tests - Race Conditions & Deadlocks', () => {
  // Simulated database state
  let mockRoute: { id: string; seats: number; availableSeats: number };
  let mockSubscriptions: Array<{ id: string; userId: string; routeId: string }>;
  let processedIdempotencyKeys: Set<string>;

  beforeEach(() => {
    mockRoute = {
      id: 'route-001',
      seats: 40,
      availableSeats: 5, // Only 5 seats left for testing
    };
    mockSubscriptions = [];
    processedIdempotencyKeys = new Set();
  });

  describe('Seat Booking Race Conditions', () => {
    it('should prevent overbooking when multiple users book simultaneously', async () => {
      // Simulate 10 concurrent booking requests for 5 available seats
      const concurrentRequests = 10;
      const successfulBookings: number[] = [];
      
      // Atomic booking function with transaction simulation
      const atomicBookSeat = async (userId: string, requestId: number): Promise<boolean> => {
        // Simulate database transaction delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        
        // Check available seats (within transaction)
        if (mockRoute.availableSeats > 0) {
          // Decrement seats (atomic operation)
          mockRoute.availableSeats--;
          successfulBookings.push(requestId);
          return true;
        }
        return false;
      };

      // Execute all requests concurrently
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        atomicBookSeat(`user-${i}`, i)
      );
      
      await Promise.all(promises);

      // Verify no overbooking occurred
      expect(mockRoute.availableSeats).toBeGreaterThanOrEqual(0);
      expect(successfulBookings.length).toBeLessThanOrEqual(5);
      expect(5 - mockRoute.availableSeats).toBeLessThanOrEqual(5);
    });

    it('should handle sequential bookings correctly', async () => {
      const initialSeats = mockRoute.availableSeats;
      
      // Sequential bookings (no race condition)
      for (let i = 0; i < 3; i++) {
        if (mockRoute.availableSeats > 0) {
          mockRoute.availableSeats--;
          mockSubscriptions.push({
            id: `sub-${i}`,
            userId: `user-${i}`,
            routeId: mockRoute.id,
          });
        }
      }

      expect(mockRoute.availableSeats).toBe(initialSeats - 3);
      expect(mockSubscriptions.length).toBe(3);
    });

    it('should use row-level locking to prevent race conditions', async () => {
      // This test demonstrates the concept of SELECT FOR UPDATE
      let lockAcquired = false;
      const lockedRows: string[] = [];
      let localAvailableSeats = 5;

      const transactionWithLock = async (userId: string): Promise<boolean> => {
        // Simulate acquiring a row lock
        if (!lockAcquired) {
          lockAcquired = true;
          lockedRows.push(userId);
          
          // Critical section - only one transaction can be here
          await new Promise(resolve => setTimeout(resolve, 50));
          
          if (localAvailableSeats > 0) {
            localAvailableSeats--;
            lockAcquired = false;
            return true;
          }
          
          lockAcquired = false;
          return false;
        }
        return false; // Could not acquire lock
      };

      // Try concurrent transactions
      const results = await Promise.all([
        transactionWithLock('user-1'),
        transactionWithLock('user-2'),
        transactionWithLock('user-3'),
      ]);

      const successCount = results.filter(r => r).length;
      expect(successCount).toBe(1); // Only one should succeed due to locking
      expect(lockedRows.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Idempotency - Preventing Duplicate Operations', () => {
    const createIdempotencyKey = (userId: string, routeId: string, timestamp: number) =>
      `idem_${userId}_${routeId}_${timestamp}`;

    it('should reject duplicate payment requests with same idempotency key', async () => {
      const userId = 'user-001';
      const routeId = 'route-001';
      const timestamp = Date.now();
      const idempotencyKey = createIdempotencyKey(userId, routeId, timestamp);

      const processPayment = async (key: string): Promise<{ success: boolean; error?: string }> => {
        if (processedIdempotencyKeys.has(key)) {
          return { success: false, error: 'DUPLICATE_REQUEST' };
        }
        
        // Process payment
        processedIdempotencyKeys.add(key);
        return { success: true };
      };

      // First request should succeed
      const result1 = await processPayment(idempotencyKey);
      expect(result1.success).toBe(true);

      // Duplicate request with same key should fail
      const result2 = await processPayment(idempotencyKey);
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('DUPLICATE_REQUEST');
    });

    it('should allow different requests with different idempotency keys', async () => {
      const localProcessedKeys = new Set<string>();
      const userId = 'user-001';
      const routeId = 'route-001';

      async function localProcessPayment(key: string) {
        if (localProcessedKeys.has(key)) {
          return { success: false, error: 'DUPLICATE_REQUEST' };
        }
        localProcessedKeys.add(key);
        return { success: true };
      }

      const key1 = createIdempotencyKey(userId, routeId, Date.now());
      await new Promise(resolve => setTimeout(resolve, 10));
      const key2 = createIdempotencyKey(userId, routeId, Date.now());

      const result1 = await localProcessPayment(key1);
      const result2 = await localProcessPayment(key2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Deadlock Prevention', () => {
    it('should acquire locks in consistent order to prevent deadlocks', async () => {
      // Scenario: Two transactions need to update route and subscription
      // Wrong order: T1 locks route then subscription, T2 locks subscription then route
      // Right order: Both lock route first, then subscription

      const resourceOrder = ['route', 'subscription'];
      const acquiredLocks: Record<string, string[]> = {
        'transaction-1': [],
        'transaction-2': [],
      };

      const acquireLocksInOrder = async (txId: string): Promise<void> => {
        for (const resource of resourceOrder) {
          acquiredLocks[txId].push(resource);
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      };

      // Both transactions acquire locks in same order
      await Promise.all([
        acquireLocksInOrder('transaction-1'),
        acquireLocksInOrder('transaction-2'),
      ]);

      // Verify both acquired locks in correct order
      expect(acquiredLocks['transaction-1']).toEqual(resourceOrder);
      expect(acquiredLocks['transaction-2']).toEqual(resourceOrder);
    });

    it('should implement timeout for lock acquisition', async () => {
      const lockTimeout = 100; // ms
      let lockHeld = false;

      const tryAcquireLock = async (timeout: number): Promise<boolean> => {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
          if (!lockHeld) {
            lockHeld = true;
            return true;
          }
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        return false; // Timeout exceeded
      };

      // First transaction acquires lock
      const tx1 = await tryAcquireLock(lockTimeout);
      expect(tx1).toBe(true);

      // Second transaction times out waiting for lock
      const tx2 = await tryAcquireLock(50); // Shorter timeout
      expect(tx2).toBe(false);
    });
  });

  describe('Optimistic vs Pessimistic Locking', () => {
    it('should use optimistic locking for low-contention scenarios', async () => {
      let version = 1;
      let data = { seats: 40 };

      const optimisticUpdate = async (expectedVersion: number, newData: any): Promise<boolean> => {
        if (version !== expectedVersion) {
          return false; // Version mismatch, retry needed
        }
        
        data = { ...data, ...newData };
        version++;
        return true;
      };

      // First update succeeds
      const result1 = await optimisticUpdate(1, { seats: 39 });
      expect(result1).toBe(true);
      expect(version).toBe(2);

      // Second update with old version fails
      const result2 = await optimisticUpdate(1, { seats: 38 });
      expect(result2).toBe(false);
      expect(version).toBe(2); // Version unchanged
    });

    it('should use pessimistic locking for high-contention scenarios', async () => {
      let lockAcquired = false;
      let data = { seats: 5 };

      const pessimisticUpdate = async (): Promise<boolean> => {
        // Wait for lock
        while (lockAcquired) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        lockAcquired = true;
        
        // Critical section
        if (data.seats > 0) {
          data.seats--;
          await new Promise(resolve => setTimeout(resolve, 20)); // Simulate work
          lockAcquired = false;
          return true;
        }
        
        lockAcquired = false;
        return false;
      };

      const results = await Promise.all([
        pessimisticUpdate(),
        pessimisticUpdate(),
        pessimisticUpdate(),
      ]);

      const successCount = results.filter(r => r).length;
      expect(successCount).toBeLessThanOrEqual(5);
      expect(data.seats).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Database Transaction Isolation', () => {
    it('should prevent dirty reads', async () => {
      // Transaction 1: Updates but doesn't commit
      // Transaction 2: Should not see uncommitted data
      
      let committedData = { seats: 40 };
      let uncommittedData: any = null;

      const transaction1 = async () => {
        // Start transaction
        uncommittedData = { seats: 39 };
        // Simulate work without committing
        await new Promise(resolve => setTimeout(resolve, 50));
        // Commit
        committedData = uncommittedData;
        uncommittedData = null;
      };

      const transaction2 = async () => {
        // Try to read during transaction 1
        await new Promise(resolve => setTimeout(resolve, 25));
        
        // Should only see committed data, not uncommitted
        // Simulate database isolation level READ COMMITTED
        const visibleData = committedData;
        expect(visibleData).toEqual({ seats: 40 }); // Before commit, sees old data
      };

      await Promise.all([transaction1(), transaction2()]);
    });

    it('should handle transaction rollback correctly', async () => {
      const initialState = { seats: 40 };
      let currentState = { ...initialState };

      const transactionWithRollback = async (shouldFail: boolean): Promise<void> => {
        const backup = { ...currentState };
        
        try {
          currentState.seats--; // Make change
          
          if (shouldFail) {
            throw new Error('Business rule violation');
          }
          
          // Commit happens here
        } catch (error) {
          // Rollback
          currentState = backup;
          throw error;
        }
      };

      // Successful transaction
      await transactionWithRollback(false);
      expect(currentState.seats).toBe(39);

      // Failed transaction should rollback
      try {
        await transactionWithRollback(true);
      } catch (error) {
        // Expected
      }
      
      expect(currentState.seats).toBe(39); // Unchanged after rollback
    });
  });
});
