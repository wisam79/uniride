import React, { createContext, useState, useContext, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";

export interface SubscriptionData {
  id: string;
  student_id: string;
  driver_id: string;
  start_date: string;
  end_date: string;
  monthly_fee: number;
  commission_rate: number;
  commission_amount: number;
  driver_payout: number;
  status: "pending" | "active" | "cancelled" | "expired";
  activation_code: string | null;
  cancelled_at: string | null;
  refund_amount: number | null;
  driver?: {
    id: string;
    user_id: string;
    vehicle_info: string | null;
    capacity: number;
    available_seats: number;
    monthly_fee: number;
  };
}

export interface SubscriptionRequestData {
  id: string;
  student_id: string;
  driver_id: string;
  institution_id: string;
  go_time: string;
  return_time: string;
  pickup_area: string | null;
  dropoff_area: string | null;
  status: "pending" | "accepted" | "rejected";
  responded_at: string | null;
  created_at: string;
}

export type SubscriptionPlan = "basic" | "standard" | "premium";

interface SubscriptionContextValue {
  subscription: SubscriptionData | null;
  pendingRequests: SubscriptionRequestData[];
  fetchSubscription: () => Promise<void>;
  submitSubscriptionRequest: (driverId: string, goTime: string, returnTime: string, pickupArea: string, dropoffArea: string) => Promise<void>;
  respondToRequest: (requestId: string, accept: boolean) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  subscribeToPlan: (driverId: string, plan: SubscriptionPlan) => Promise<void>;
  bookRoute: (routeId: string) => Promise<void>;
  fetchPendingRequests: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [pendingRequests, setPendingRequests] = useState<SubscriptionRequestData[]>([]);

  const fetchSubscription = useCallback(async () => {
    if (!user || user.role !== "student") return;
    const { data } = await supabase
      .from("subscriptions")
      .select("*, driver:drivers(id, user_id, vehicle_info, capacity, available_seats, monthly_fee)")
      .eq("student_id", user.id)
      .in("status", ["pending", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription(data as SubscriptionData | null);
  }, [user]);

  async function submitSubscriptionRequest(
    driverId: string,
    goTime: string,
    returnTime: string,
    pickupArea: string,
    dropoffArea: string
  ) {
    if (!user || !user.institution_id) {
      throw new Error("يجب تحديد المؤسسة أولاً");
    }
    const { error } = await supabase.from("subscription_requests").insert({
      student_id: user.id,
      driver_id: driverId,
      institution_id: user.institution_id,
      go_time: goTime,
      return_time: returnTime,
      pickup_area: pickupArea,
      dropoff_area: dropoffArea,
    });
    if (error) throw error;
  }

  async function respondToRequest(requestId: string, accept: boolean) {
    const { error } = await supabase
      .from("subscription_requests")
      .update({ status: accept ? "accepted" : "rejected", responded_at: new Date().toISOString() })
      .eq("id", requestId);
    if (error) throw error;
    await fetchPendingRequests();
  }

  async function cancelSubscription() {
    if (!subscription) return;
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", subscription.id);
    if (error) throw error;
    setSubscription(null);
  }

  async function subscribeToPlan(driverId: string, plan: SubscriptionPlan) {
    if (!user) return;

    const { data: driverData, error: driverError } = await supabase
      .from("drivers")
      .select("monthly_fee")
      .eq("id", driverId)
      .single();

    if (driverError || !driverData) {
      throw new Error("فشل جلب بيانات السائق");
    }

    // ARCHITECTURE / BUSINESS LOGIC FIX: Never fallback to hardcoded financial constants.
    // If the backend does not provide a valid pricing configuration, we must fail closed.
    if (typeof driverData.monthly_fee !== 'number' || driverData.monthly_fee <= 0) {
      throw new Error("بيانات تسعير السائق غير صالحة ولا يمكن إتمام الاشتراك");
    }

    const monthlyFee = driverData.monthly_fee;

    const { error } = await supabase.from("subscriptions").insert({
      student_id: user.id,
      driver_id: driverId,
      monthly_fee: monthlyFee,
      status: "pending",
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    });
    if (error) throw error;
    await fetchSubscription();
  }

  async function bookRoute(routeId: string) {
    if (!user) return;

    if (subscription && (subscription.status === "active" || subscription.status === "pending")) {
      throw new Error("لديك اشتراك نشط أو قيد الانتظار بالفعل");
    }

    const { data: routeData, error: routeError } = await supabase
      .from("routes")
      .select("driver_id, monthly_fee")
      .eq("id", routeId)
      .single();

    if (routeError || !routeData) {
      throw new Error("فشل جلب بيانات المسار");
    }

    const { error } = await supabase.from("subscriptions").insert({
      student_id: user.id,
      driver_id: routeData.driver_id,
      monthly_fee: routeData.monthly_fee || 90000,
      status: "pending",
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    });
    if (error) throw error;
    await fetchSubscription();
  }

  const fetchPendingRequests = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", session.user.id)
      .single();

    if (!profile || profile.role !== "driver") return;

    const { data: drv } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", session.user.id)
      .single();
    if (!drv) return;

    const { data } = await supabase
      .from("subscription_requests")
      .select("*")
      .eq("driver_id", drv.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (data) setPendingRequests(data as SubscriptionRequestData[]);
  }, []);

  // ARCHITECTURE / PERFORMANCE FIX: Strictly memoize the context value to prevent cascading re-renders
  const value = React.useMemo<SubscriptionContextValue>(() => ({
    subscription,
    pendingRequests,
    fetchSubscription,
    submitSubscriptionRequest,
    respondToRequest,
    cancelSubscription,
    subscribeToPlan,
    bookRoute,
    fetchPendingRequests,
  }), [subscription, pendingRequests, fetchSubscription, fetchPendingRequests, user]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
ovider>;
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
