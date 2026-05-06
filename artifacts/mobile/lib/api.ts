import { supabase } from "./supabase";
import type { SubscriptionData, TripData } from "@/context";

export const api = {

  getSubscriptions: async (): Promise<SubscriptionData[]> => {
    const { data, error } = await supabase.from("subscriptions").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data as SubscriptionData[];
  },

  getTrips: async (): Promise<TripData[]> => {
    const { data, error } = await supabase.from("trips").select("*").order("trip_date", { ascending: false });
    if (error) throw error;
    return data as TripData[];
  },

  getDriverRoutes: async (driverId: string) => {
    const { data, error } = await supabase.from("routes").select("*").eq("driver_id", driverId).eq("is_active", true);
    if (error) throw error;
    return data;
  },

  getAvailableRoutes: async (institutionId?: string) => {
    let query = supabase.from("routes").select("*").eq("is_active", true).gt("available_seats", 0);
    if (institutionId) query = query.eq("institution_id", institutionId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  estimateFare: (monthlyFee: number): number => {
    return monthlyFee;
  },
};
