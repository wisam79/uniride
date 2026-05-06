import React, { createContext, useState, useContext, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";

export interface DriverProfile {
  id: string;
  user_id: string;
  vehicle_info: string | null;
  capacity: number;
  available_seats: number;
  monthly_fee: number;
  commission_rate: number;
  is_available: boolean;
  is_online: boolean;
  institution_id: string | null;
  profile?: {
    id: string;
    full_name: string;
    phone: string | null;
  };
}

interface DriverContextValue {
  driver: DriverProfile | null;
  availableDrivers: DriverProfile[];
  fetchDriverProfile: () => Promise<void>;
  fetchAvailableDrivers: (institutionId: string) => Promise<void>;
  setAvailableDrivers: React.Dispatch<React.SetStateAction<DriverProfile[]>>;
}

const DriverContext = createContext<DriverContextValue | null>(null);

export function DriverProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [availableDrivers, setAvailableDrivers] = useState<DriverProfile[]>([]);

  const fetchDriverProfile = useCallback(async () => {
    if (!user || user.role !== "driver") return;
    const { data: drv } = await supabase
      .from("drivers")
      .select("*, profile:profiles!drivers_user_id_fkey(id, full_name, phone)")
      .eq("user_id", user.id)
      .single();
    if (drv) {
      setDriver(drv as DriverProfile);
    }
  }, [user]);



  const fetchAvailableDrivers = useCallback(async (institutionId: string) => {
    const { data } = await supabase
      .from("drivers")
      .select("*, profile:profiles!drivers_user_id_fkey(id, full_name, phone)")
      .eq("institution_id", institutionId)
      .eq("is_available", true)
      .gt("available_seats", 0);
    if (data) setAvailableDrivers(data as DriverProfile[]);
  }, []);

  // ARCHITECTURE / PERFORMANCE FIX: Strictly memoize the context value to prevent cascading re-renders
  const value = React.useMemo<DriverContextValue>(() => ({
    driver,
    availableDrivers,
    fetchDriverProfile,
    fetchAvailableDrivers,
    setAvailableDrivers,
  }), [driver, availableDrivers, fetchDriverProfile, fetchAvailableDrivers]);

  return <DriverContext.Provider value={value}>{children}</DriverContext.Provider>;
}

export function useDriver() {
  const ctx = useContext(DriverContext);
  if (!ctx) throw new Error("useDriver must be used within DriverProvider");
  return ctx;
}
