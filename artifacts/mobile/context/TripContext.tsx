import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";
import { useDriver } from "./DriverContext";

export interface TripData {
  id: string;
  driver_id: string;
  direction: "go" | "return";
  trip_date: string;
  status: "scheduled" | "driver_waiting" | "in_transit" | "completed" | "absent" | "cancelled";
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  subscription_id?: string;
}

export interface TripLocation {
  lat: number;
  lng: number;
  address: string;
}

interface TripContextValue {
  activeTrip: TripData | null;
  tripHistory: TripData[];
  error: string | null;
  requestTrip: (origin: TripLocation, dest: TripLocation, driverId?: string, fare?: number) => Promise<void>;
  startTrip: (direction: "go" | "return") => Promise<void>;
  endTrip: (tripId: string) => Promise<void>;
  cancelTrip: (tripId: string) => Promise<void>;
  acceptTrip: (requestId: string) => Promise<void>;
  updateTripStatus: (tripId: string, status: TripData["status"]) => Promise<void>;
  fetchTripHistory: () => Promise<void>;
  setActiveTrip: React.Dispatch<React.SetStateAction<TripData | null>>;
  clearError: () => void;
}

const TripContext = createContext<TripContextValue | null>(null);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { driver } = useDriver();
  const [activeTrip, setActiveTrip] = useState<TripData | null>(null);
  const [tripHistory, setTripHistory] = useState<TripData[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Clear error after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Realtime subscription for student trip updates
  useEffect(() => {
    if (!user || driver) return; // Only for students

    const channel = supabase
      .channel(`student-trips-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trip_students',
        },
        async (payload) => {
          const updatedRecord = payload.new as { trip_id: string; student_id: string; status: string };
          if (updatedRecord.student_id === user.id && activeTrip?.id === updatedRecord.trip_id) {
            const { data: tripData } = await supabase
              .from('trips')
              .select('*')
              .eq('id', updatedRecord.trip_id)
              .single();
            if (tripData) {
              setActiveTrip(prev => prev && prev.id === tripData.id ? tripData as TripData : prev);
              setTripHistory(prev =>
                prev.map(t => t.id === tripData.id ? tripData as TripData : t)
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, driver, activeTrip?.id]);

  async function requestTrip(origin: TripLocation, dest: TripLocation, driverId?: string, fare?: number) {
    if (!user || !driverId) return;

    const { error } = await supabase.from('subscription_requests').insert({
      student_id: user.id,
      driver_id: driverId,
      institution_id: user.institution_id,
      pickup_area: origin.address,
      dropoff_area: dest.address,
    });

    if (error) {
      setError(error.message);
      return;
    }
  }

  async function startTrip(direction: "go" | "return") {
    if (!driver) return;

    const { data, error } = await supabase.from('trips').insert({
      driver_id: driver.id,
      direction,
      status: 'driver_waiting'
    }).select().single();

    if (error) {
      setError(error.message);
      return;
    }
    if (data) {
      setActiveTrip(data as unknown as TripData);
    }
  }

  async function endTrip(tripId: string) {
    const { error } = await supabase.rpc('transition_trip_status', {
      target_trip_id: tripId,
      new_status: 'completed'
    });

    if (error) {
      setError(error.message);
      return;
    }
    setActiveTrip(null);
  }

  async function cancelTrip(tripId: string) {
    const { error } = await supabase.rpc('transition_trip_status', {
      target_trip_id: tripId,
      new_status: 'cancelled'
    });

    if (error) {
      setError(error.message);
      return;
    }
    setActiveTrip(prev => prev && prev.id === tripId ? { ...prev, status: 'cancelled' } : prev);
  }

  async function acceptTrip(tripId: string) {
    const { error } = await supabase.rpc('transition_trip_status', {
      target_trip_id: tripId,
      new_status: 'in_transit'
    });

    if (error) {
      setError(error.message);
      return;
    }
    
    // Update local state
    setActiveTrip(prev => prev && prev.id === tripId ? { ...prev, status: 'in_transit' } : prev);
  }

  async function fetchTripHistory() {
    if (!user) return;

    let tripsData: any[] = [];

    if (driver) {
      const { data, error } = await supabase.from('trips')
        .select('*')
        .eq('driver_id', driver.id)
        .order('created_at', { ascending: false });
      if (error) {
        setError(error.message);
        return;
      }
      if (data) tripsData = data;
    } else {
      const { data, error } = await supabase.from('trip_students')
        .select('trips(*)')
        .eq('student_id', user.id);

      if (error) {
        setError(error.message);
        return;
      }
      if (data) {
        tripsData = data.map(d => d.trips).filter(Boolean);
      }
    }

    setTripHistory(tripsData as TripData[]);
  }

  // ARCHITECTURE / PERFORMANCE FIX: Strictly memoize the context value to prevent cascading re-renders
  const value = React.useMemo<TripContextValue>(() => ({
    activeTrip,
    tripHistory,
    error,
    requestTrip,
    startTrip,
    endTrip,
    cancelTrip,
    acceptTrip,
    updateTripStatus,
    fetchTripHistory,
    setActiveTrip,
    clearError: () => setError(null),
  }), [activeTrip, tripHistory, error]);

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used within TripProvider");
  return ctx;
}