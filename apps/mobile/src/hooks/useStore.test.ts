import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore, useTripStore, useBookingStore, useI18nStore } from './useStore';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
  WHEN_UNLOCKED: 'WHEN_UNLOCKED',
}));

describe('Zustand Stores', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
    useTripStore.getState().clearTrip();
    useBookingStore.getState().resetBooking();
  });

  describe('useAuthStore', () => {
    it('initializes with null user and role', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.role).toBeNull();
      expect(state.initialized).toBe(false);
    });

    it('setAuth updates user and role', () => {
      useAuthStore.getState().setAuth({ id: 'u1', email: 'test@test.com' }, 'student');
      const state = useAuthStore.getState();
      expect(state.user).toEqual({ id: 'u1', email: 'test@test.com' });
      expect(state.role).toBe('student');
    });

    it('setProfile updates profile', () => {
      useAuthStore.getState().setProfile({ full_name: 'John', phone: '123' });
      const state = useAuthStore.getState();
      expect(state.profile).toEqual({ full_name: 'John', phone: '123' });
    });

    it('setInitialized updates initialized status', () => {
      useAuthStore.getState().setInitialized(true);
      expect(useAuthStore.getState().initialized).toBe(true);
    });

    it('logout clears state', () => {
      useAuthStore.getState().setAuth({ id: 'u1' }, 'driver');
      useAuthStore.getState().setProfile({ full_name: 'John', phone: '123' });
      useAuthStore.getState().logout();
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.role).toBeNull();
      expect(state.profile).toBeNull();
    });
  });

  describe('useTripStore', () => {
    it('setActiveTrip updates state', () => {
      useTripStore.getState().setActiveTrip('t1', 'in_transit', 'r1');
      const state = useTripStore.getState();
      expect(state.activeTripId).toBe('t1');
      expect(state.currentStatus).toBe('in_transit');
      expect(state.tripRouteId).toBe('r1');
    });

    it('updateStatus updates status', () => {
      useTripStore.getState().setActiveTrip('t1', 'in_transit', 'r1');
      useTripStore.getState().updateStatus('completed');
      expect(useTripStore.getState().currentStatus).toBe('completed');
    });
  });

  describe('useBookingStore', () => {
    it('setBooking updates isBooking', () => {
      useBookingStore.getState().setBooking(true);
      expect(useBookingStore.getState().isBooking).toBe(true);
    });

    it('setBookingResult updates state', () => {
      useBookingStore.getState().setBookingResult('sub1', 'error1');
      const state = useBookingStore.getState();
      expect(state.isBooking).toBe(false);
      expect(state.lastBookingId).toBe('sub1');
      expect(state.bookingError).toBe('error1');
    });

    it('setIdempotencyKey updates key', () => {
      useBookingStore.getState().setIdempotencyKey('key1');
      expect(useBookingStore.getState().idempotencyKey).toBe('key1');
    });
  });

  describe('useI18nStore', () => {
    it('setLanguage updates language', () => {
      useI18nStore.getState().setLanguage('en');
      expect(useI18nStore.getState().language).toBe('en');
    });
  });
});
