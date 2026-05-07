import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PersistOptions } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { mmkvStorage } from '@/lib/storage';

export interface TripLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface TripData {
  id: string;
  driver_id: string;
  direction: 'go' | 'return';
  trip_date: string;
  status: 'scheduled' | 'driver_waiting' | 'in_transit' | 'completed' | 'absent' | 'cancelled';
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  subscription_id?: string;
}

interface TripState {
  activeTrip: TripData | null;
  tripHistory: TripData[];
  error: string | null;
  setActiveTrip: (trip: TripData | null) => void;
  setTripHistory: (history: TripData[]) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  startTrip: (direction: 'go' | 'return', driverId: string) => Promise<void>;
  endTrip: (tripId: string) => Promise<void>;
  cancelTrip: (tripId: string) => Promise<void>;
  acceptTrip: (tripId: string) => Promise<void>;
  updateTripStatus: (tripId: string, status: TripData['status']) => Promise<void>;
}

type TripPersist = PersistOptions<TripState>;

const persistConfig: TripPersist = {
  name: 'trip-storage',
  storage: mmkvStorage,
};

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      activeTrip: null,
      tripHistory: [],
      error: null,

      setActiveTrip: (trip) => {
        set({ activeTrip: trip });
      },

      setTripHistory: (history: TripData[]) => {
        set({ tripHistory: history });
      },

      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      startTrip: async (direction, driverId) => {
        const { data, error } = await supabase.from('trips').insert({
          driver_id: driverId,
          direction,
          status: 'scheduled',
        }).select().single();

        if (error) {
          set({ error: error.message });
          return;
        }

        if (data) {
          const { error: transitionError } = await supabase.rpc('transition_trip_status', {
            target_trip_id: data.id,
            new_status: 'driver_waiting',
          });

          if (transitionError) {
            set({ error: transitionError.message });
            return;
          }

          set({ activeTrip: { ...data, status: 'driver_waiting' } });
        }
      },

      endTrip: async (tripId) => {
        const { error } = await supabase.rpc('transition_trip_status', {
          target_trip_id: tripId,
          new_status: 'completed',
        });

        if (error) {
          set({ error: error.message });
          return;
        }
        set({ activeTrip: null });
      },

      cancelTrip: async (tripId) => {
        const { error } = await supabase.rpc('transition_trip_status', {
          target_trip_id: tripId,
          new_status: 'cancelled',
        });

        if (error) {
          set({ error: error.message });
          return;
        }
        set((state) => ({
          activeTrip: state.activeTrip && state.activeTrip.id === tripId
            ? { ...state.activeTrip, status: 'cancelled' as const }
            : state.activeTrip,
        }));
      },

      acceptTrip: async (tripId) => {
        const { error } = await supabase.rpc('transition_trip_status', {
          target_trip_id: tripId,
          new_status: 'in_transit',
        });

        if (error) {
          set({ error: error.message });
          return;
        }
        set((state) => ({
          activeTrip: state.activeTrip && state.activeTrip.id === tripId
            ? { ...state.activeTrip, status: 'in_transit' as const }
            : state.activeTrip,
        }));
      },

      updateTripStatus: async (tripId, status) => {
        const { error } = await supabase.rpc('transition_trip_status', {
          target_trip_id: tripId,
          new_status: status,
        });

        if (error) {
          set({ error: error.message });
          return;
        }
        set((state) => ({
          activeTrip: state.activeTrip && state.activeTrip.id === tripId
            ? { ...state.activeTrip, status }
            : state.activeTrip,
        }));
      },
    }),
    persistConfig,
  ),
);
