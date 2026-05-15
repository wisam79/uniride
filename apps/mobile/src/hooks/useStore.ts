import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from '../lib/secureStorage';
import { UserRole, TripStatus, Language } from '@uniride/core';

interface AuthUser {
  id: string;
  email?: string;
  // NOTE: user_metadata is intentionally excluded — use app_metadata.role via authProvider only
}

interface AuthState {
  user: AuthUser | null;
  role: UserRole | null;
  profile: { full_name: string; phone: string; institution_id?: string | null } | null;
  initialized: boolean;
  setAuth: (user: AuthUser | null, role: UserRole | null) => void;
  setProfile: (profile: {
    full_name: string;
    phone: string;
    institution_id?: string | null;
  }) => void;
  setInitialized: (initialized: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      profile: null,
      initialized: false,
      setAuth: (user, role) => set({ user, role }),
      setProfile: (profile) => set({ profile }),
      setInitialized: (initialized) => set({ initialized }),
      logout: () => set({ user: null, role: null, profile: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ user: state.user, role: state.role, profile: state.profile }),
    },
  ),
);

interface TripState {
  activeTripId: string | null;
  currentStatus: TripStatus | null;
  tripRouteId: string | null;
  setActiveTrip: (tripId: string, status: TripStatus, routeId: string) => void;
  updateStatus: (status: TripStatus) => void;
  clearTrip: () => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      activeTripId: null,
      currentStatus: null,
      tripRouteId: null,
      setActiveTrip: (tripId, status, routeId) =>
        set({ activeTripId: tripId, currentStatus: status, tripRouteId: routeId }),
      updateStatus: (status) => set({ currentStatus: status }),
      clearTrip: () => set({ activeTripId: null, currentStatus: null, tripRouteId: null }),
    }),
    {
      name: 'trip-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

interface BookingState {
  isBooking: boolean;
  lastBookingId: string | null;
  bookingError: string | null;
  idempotencyKey: string | null;
  setBooking: (isBooking: boolean) => void;
  setBookingResult: (subscriptionId: string | null, error: string | null) => void;
  resetBooking: () => void;
  setIdempotencyKey: (key: string) => void;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      isBooking: false,
      lastBookingId: null,
      bookingError: null,
      idempotencyKey: null,
      setBooking: (isBooking) => set({ isBooking }),
      setBookingResult: (subscriptionId, error) =>
        set({ isBooking: false, lastBookingId: subscriptionId, bookingError: error }),
      resetBooking: () =>
        set({ isBooking: false, lastBookingId: null, bookingError: null, idempotencyKey: null }),
      setIdempotencyKey: (key) => set({ idempotencyKey: key }),
    }),
    {
      name: 'booking-storage',
      storage: createJSONStorage(() => secureStorage),
    },
  ),
);

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      language: 'ar' as Language,
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'i18n-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
