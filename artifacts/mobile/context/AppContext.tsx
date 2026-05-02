import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { api } from "../lib/api";

export type UserRole = "student" | "driver";

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  university?: string | null;
  vehicleType?: string | null;
  vehiclePlate?: string | null;
  vehicleColor?: string | null;
  rating: string;
  totalTrips: number;
  isOnline: boolean;
  isAdmin: boolean;
  balance: string;
  basicFare: number;
  standardFare: number;
  premiumFare: number;
}

export type TripStatus =
  | "waiting"
  | "accepted"
  | "pickup"
  | "inprogress"
  | "arrived"
  | "completed"
  | "cancelled";

export interface TripLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface Trip {
  id: string;
  studentId: string;
  studentName: string;
  driverId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  driverVehicle?: string | null;
  driverRating?: string | null;
  originLat: string;
  originLng: string;
  originAddress: string;
  destLat: string;
  destLng: string;
  destAddress: string;
  status: TripStatus;
  startTime: string;
  endTime?: string | null;
  fare: string;
  driverShare?: string | null;
  appCommission?: string | null;
  distance?: string | null;
  notes?: string | null;
  // Computed aliases for UI compatibility
  origin?: TripLocation;
  destination?: TripLocation;
}

export type SubscriptionPlan = "basic" | "standard" | "premium";

export interface Subscription {
  id: string;
  studentId: string;
  driverId: string;
  driverName: string;
  plan: SubscriptionPlan;
  startDate: string;
  endDate: string;
  isActive: boolean;
  monthlyFare: string;
  tripsPerMonth: number;
  tripsUsed: number;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleType?: string | null;
  vehiclePlate?: string | null;
  vehicleColor?: string | null;
  rating: string;
  totalTrips: number;
  isOnline: boolean;
  university?: string | null;
  basicFare: number;
  standardFare: number;
  premiumFare: number;
  gender?: "male" | "female" | null;
  genderPreference?: "any" | "female" | "male";
  seatsCapacity?: number;
}

export interface Route {
  id: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  vehicleType?: string | null;
  vehiclePlate?: string | null;
  vehicleColor?: string | null;
  fromArea: string;
  fromCity: string;
  toUniversity: string;
  departureMorning: string;
  departureEvening: string;
  totalSeats: number;
  availableSeats: number;
  monthlyFare: string;
  genderPreference: "any" | "female" | "male";
  rating: string;
  totalStudents: number;
  notes?: string | null;
  isActive: boolean;
}

export interface AppNotification { id: string; message: string; type: "success" | "error" | "info" | "warning" }

interface AppContextValue {
  user: User | null;
  isAuthenticated: boolean;
  activeTrip: Trip | null;
  subscription: Subscription | null;
  tripHistory: Trip[];
  availableDrivers: Driver[];
  availableRoutes: Route[];
  todayEarnings: number;
  weeklyEarnings: number;
  pendingRequest: Trip | null;
  isDriverOnline: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  pollError: boolean;
  weeklyEarningsData: { day: string; amount: number }[];
  monthlyEarnings: number;
  notifications: AppNotification[];
  notify: (message: string, type?: AppNotification["type"]) => void;
  dismissNotification: (id: string) => void;
  estimateFare: (origin: TripLocation, destination: TripLocation) => Promise<{ estimatedFare: number; distanceKm: number }>;
  refreshUser: () => Promise<void>;
  login: (userData: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  setActiveTrip: (trip: Trip | null) => void;
  setSubscription: (sub: Subscription | null) => void;
  requestTrip: (origin: TripLocation, destination: TripLocation, driverId?: string, fare?: number) => Promise<void>;
  acceptTrip: (tripId: string) => Promise<void>;
  cancelTrip: (tripId: string) => Promise<void>;
  completeTrip: (tripId: string) => Promise<void>;
  updateTripStatus: (tripId: string, status: TripStatus) => Promise<void>;
  toggleDriverOnline: () => Promise<void>;
  subscribeToPlan: (driverId: string, plan: SubscriptionPlan) => Promise<void>;
  bookRoute: (routeId: string) => Promise<void>;
  notifyAbsence: (driverId: string, reason?: string) => Promise<void>;
  rateDriver: (tripId: string, rating: number, comment?: string) => Promise<void>;
  refreshDrivers: () => Promise<void>;
  refreshRoutes: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  myDriverRoutes: Route[];
  createRoute: (data: Omit<Route, "id" | "driverId" | "driverName" | "driverPhone" | "vehicleType" | "vehiclePlate" | "vehicleColor" | "rating" | "totalStudents" | "isActive">) => Promise<Route>;
  updateRoute: (routeId: string, data: Partial<Route>) => Promise<void>;
  deleteRoute: (routeId: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function tripWithAliases(trip: Trip): Trip {
  return {
    ...trip,
    origin: { lat: Number(trip.originLat), lng: Number(trip.originLng), address: trip.originAddress },
    destination: { lat: Number(trip.destLat), lng: Number(trip.destLng), address: trip.destAddress },
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTrip, setActiveTripState] = useState<Trip | null>(null);
  const [subscription, setSubscriptionState] = useState<Subscription | null>(null);
  const [tripHistory, setTripHistory] = useState<Trip[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [availableRoutes, setAvailableRoutes] = useState<Route[]>([]);
  const [myDriverRoutes, setMyDriverRoutes] = useState<Route[]>([]);
  const [isDriverOnline, setIsDriverOnline] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pollError, setPollError] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const pollErrorCount = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  useEffect(() => {
    loadStoredSession();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      startPolling();
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isAuthenticated]);

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      pollData();
    }, 8000);
  }

  async function pollData() {
    try {
      const [tripData, pendingData] = await Promise.all([
        api.get<Trip | null>("/trips/active").catch((err) => { throw err; }),
        userRef.current?.role === "driver" ? api.get<Trip | null>("/trips/pending").catch((err) => { throw err; }) : Promise.resolve(null),
      ]);
      if (tripData) setActiveTripState(tripWithAliases(tripData));
      else setActiveTripState(null);
      if (pendingData) setPendingRequest(tripWithAliases(pendingData));
      else setPendingRequest(null);
      
      pollErrorCount.current = 0;
      setPollError(false);
    } catch {
      pollErrorCount.current += 1;
      if (pollErrorCount.current >= 3) {
        setPollError(true);
      }
    }
  }

  async function loadStoredSession() {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) { setIsLoading(false); return; }
      const userData = await api.get<User>("/auth/me");
      setUser(userData);
      setIsAuthenticated(true);
      setIsDriverOnline(userData.isOnline);
      await Promise.all([
        fetchActiveTrip(),
        fetchSubscription(),
        fetchDrivers(),
        fetchHistory(),
        fetchRoutes(),
      ]);
    } catch {
      await AsyncStorage.removeItem("token");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchActiveTrip() {
    try {
      const trip = await api.get<Trip | null>("/trips/active");
      setActiveTripState(trip ? tripWithAliases(trip) : null);
    } catch { /* ignore */ }
  }

  async function fetchSubscription() {
    try {
      const sub = await api.get<Subscription | null>("/subscriptions/me");
      setSubscriptionState(sub);
    } catch { /* ignore */ }
  }

  async function fetchDrivers() {
    try {
      const drivers = await api.get<Driver[]>("/drivers/all");
      setAvailableDrivers(drivers);
    } catch { /* ignore */ }
  }

  async function fetchRoutes() {
    try {
      const routes = await api.get<Route[]>("/routes");
      setAvailableRoutes(routes);
    } catch { /* ignore */ }
  }

  async function fetchMyDriverRoutes() {
    try {
      const routes = await api.get<Route[]>("/routes/my");
      setMyDriverRoutes(routes);
    } catch { /* ignore */ }
  }

  async function fetchHistory() {
    try {
      const history = await api.get<Trip[]>("/trips/history");
      setTripHistory(history.map(tripWithAliases));
    } catch { /* ignore */ }
  }

  async function login(userData: User, token: string) {
    await AsyncStorage.setItem("token", token);
    setUser(userData);
    setIsAuthenticated(true);
    setIsDriverOnline(userData.isOnline);
    await Promise.all([fetchActiveTrip(), fetchSubscription(), fetchDrivers(), fetchHistory(), fetchRoutes()]);
  }

  async function logout() {
    setUser(null);
    setIsAuthenticated(false);
    setActiveTripState(null);
    setSubscriptionState(null);
    setTripHistory([]);
    setPendingRequest(null);
    await AsyncStorage.removeItem("token");
  }

  async function updateUser(updates: Partial<User>) {
    try {
      const updated = await api.patch<User>("/auth/me", updates);
      setUser(updated);
      if ("isOnline" in updates) setIsDriverOnline(Boolean(updates.isOnline));
    } catch { /* ignore */ }
  }

  function setActiveTrip(trip: Trip | null) {
    setActiveTripState(trip ? tripWithAliases(trip) : null);
  }

  function setSubscription(sub: Subscription | null) {
    setSubscriptionState(sub);
  }

  async function refreshUser() {
    try {
      const updated = await api.get<User>("/auth/me");
      setUser(updated);
      setIsDriverOnline(updated.isOnline);
    } catch { /* ignore */ }
  }

  function notify(message: string, type: AppNotification["type"] = "info") {
    const id = Math.random().toString(36).slice(2);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  }

  function dismissNotification(id: string) {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  async function estimateFare(origin: TripLocation, destination: TripLocation): Promise<{ estimatedFare: number; distanceKm: number }> {
    try {
      const params = new URLSearchParams({
        originLat: String(origin.lat),
        originLng: String(origin.lng),
        destLat: String(destination.lat),
        destLng: String(destination.lng),
      });
      const result = await api.get<{ estimatedFare: number; distanceKm: number }>(`/trips/fare-estimate?${params}`);
      return result;
    } catch {
      // Fallback: calculate locally
      const R = 6371;
      const dLat = (destination.lat - origin.lat) * Math.PI / 180;
      const dLng = (destination.lng - origin.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(origin.lat*Math.PI/180)*Math.cos(destination.lat*Math.PI/180)*Math.sin(dLng/2)**2;
      const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const estimatedFare = Math.max(20000, Math.min(200000, Math.round((15000 + distanceKm * 3000) / 5000) * 5000));
      return { estimatedFare, distanceKm };
    }
  }

  async function requestTrip(origin: TripLocation, destination: TripLocation, driverId?: string, fare?: number) {
    if (!user) return;
    try {
      const trip = await api.post<Trip>("/trips", {
        originLat: origin.lat,
        originLng: origin.lng,
        originAddress: origin.address,
        destLat: destination.lat,
        destLng: destination.lng,
        destAddress: destination.address,
        fare: fare ?? 75000,
        driverId,
      });
      setActiveTripState(tripWithAliases(trip));
    } catch (err) {
      throw err;
    }
  }

  async function acceptTrip(tripId: string) {
    try {
      const trip = await api.patch<Trip>(`/trips/${tripId}/status`, { status: "accepted" });
      setActiveTripState(tripWithAliases(trip));
      setPendingRequest(null);
      notify("تم قبول الرحلة!", "success");
    } catch { /* ignore */ }
  }

  async function cancelTrip(tripId: string) {
    try {
      await api.delete(`/trips/${tripId}`);
      setActiveTripState(null);
      await fetchHistory();
      notify("تم إلغاء الرحلة", "warning");
    } catch { /* ignore */ }
  }

  async function completeTrip(tripId: string) {
    try {
      const trip = await api.patch<Trip>(`/trips/${tripId}/status`, { status: "completed" });
      setActiveTripState(null);
      setTripHistory((prev) => [tripWithAliases(trip), ...prev]);
      notify("تم إنهاء الرحلة بنجاح! 🎉", "success");
    } catch { /* ignore */ }
  }

  async function updateTripStatus(tripId: string, status: TripStatus) {
    try {
      const trip = await api.patch<Trip>(`/trips/${tripId}/status`, { status });
      setActiveTripState(tripWithAliases(trip));
    } catch { /* ignore */ }
  }

  async function toggleDriverOnline() {
    const newState = !isDriverOnline;
    setIsDriverOnline(newState);
    try {
      const updated = await api.patch<User>("/drivers/online", { isOnline: newState });
      setUser(updated);
      if (newState) {
        await fetchActiveTrip();
        const pending = await api.get<Trip | null>("/trips/pending").catch(() => null);
        if (pending) setPendingRequest(tripWithAliases(pending));
        notify("تم تفعيل حالة التوفر", "info");
      } else {
        setPendingRequest(null);
      }
    } catch {
      setIsDriverOnline(!newState);
    }
  }

  async function subscribeToPlan(driverId: string, plan: SubscriptionPlan) {
    try {
      const sub = await api.post<Subscription>("/subscriptions", { driverId, plan });
      setSubscriptionState(sub);
    } catch (err) {
      throw err;
    }
  }

  async function bookRoute(routeId: string) {
    const result = await api.post<{ subscription: Subscription; route: Route }>(`/routes/${routeId}/book`, {});
    setSubscriptionState(result.subscription);
    await fetchRoutes();
  }

  async function notifyAbsence(driverId: string, reason?: string) {
    const today = new Date().toISOString().split("T")[0];
    await api.post("/absences", { driverId, date: today, reason });
  }

  async function createRoute(data: Omit<Route, "id" | "driverId" | "driverName" | "driverPhone" | "vehicleType" | "vehiclePlate" | "vehicleColor" | "rating" | "totalStudents" | "isActive">): Promise<Route> {
    const route = await api.post<Route>("/routes", {
      ...data,
      monthlyFare: Number(data.monthlyFare),
    });
    await fetchMyDriverRoutes();
    return route;
  }

  async function updateRoute(routeId: string, data: Partial<Route>) {
    await api.patch<Route>(`/routes/${routeId}`, {
      ...data,
      monthlyFare: data.monthlyFare !== undefined ? Number(data.monthlyFare) : undefined,
    });
    await fetchMyDriverRoutes();
  }

  async function deleteRoute(routeId: string) {
    await api.delete(`/routes/${routeId}`);
    setMyDriverRoutes((prev) => prev.filter((r) => r.id !== routeId));
  }

  async function rateDriver(tripId: string, rating: number, comment?: string): Promise<void> {
    await api.post('/ratings', { tripId, rating, comment });
    await fetchHistory();
  }

  const fetchDriversWithLoading = async () => {
    setIsRefreshing(true);
    await fetchDrivers();
    setIsRefreshing(false);
  };

  const fetchHistoryWithLoading = async () => {
    setIsRefreshing(true);
    await fetchHistory();
    setIsRefreshing(false);
  };

  const fetchRoutesWithLoading = async () => {
    setIsRefreshing(true);
    await fetchRoutes();
    setIsRefreshing(false);
  };

  const refreshDrivers = useCallback(fetchDriversWithLoading, []);
  const refreshHistory = useCallback(fetchHistoryWithLoading, []);
  const refreshRoutes = useCallback(fetchRoutesWithLoading, []);

  const todayEarnings = tripHistory
    .filter((t) => {
      const today = new Date();
      const tripDate = new Date(t.startTime);
      return (
        t.status === "completed" &&
        tripDate.getDate() === today.getDate() &&
        tripDate.getMonth() === today.getMonth()
      );
    })
    .reduce((sum, t) => sum + Number(t.driverShare ?? 0), 0);

  const weeklyEarnings = tripHistory
    .filter((t) => {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return t.status === "completed" && new Date(t.startTime).getTime() > weekAgo;
    })
    .reduce((sum, t) => sum + Number(t.driverShare ?? 0), 0);

  const weeklyEarningsData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayEarnings = tripHistory
      .filter(t => {
        const td = new Date(t.startTime);
        return t.status === 'completed' &&
          td.getDate() === date.getDate() &&
          td.getMonth() === date.getMonth();
      })
      .reduce((sum, t) => sum + Number(t.driverShare ?? 0), 0);
    const days = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    return { day: days[date.getDay()], amount: dayEarnings };
  });

  const monthlyEarnings = tripHistory
    .filter(t => {
      const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return t.status === 'completed' && new Date(t.startTime).getTime() > monthAgo;
    })
    .reduce((sum, t) => sum + Number(t.driverShare ?? 0), 0);

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticated,
        activeTrip,
        subscription,
        tripHistory,
        availableDrivers,
        todayEarnings,
        weeklyEarnings,
        weeklyEarningsData,
        monthlyEarnings,
        pendingRequest,
        isDriverOnline,
        isLoading,
        isRefreshing,
        pollError,
        notifications,
        notify,
        dismissNotification,
        estimateFare,
        refreshUser,
        login,
        logout,
        updateUser,
        setActiveTrip,
        setSubscription,
        requestTrip,
        acceptTrip,
        cancelTrip,
        completeTrip,
        updateTripStatus,
        toggleDriverOnline,
        subscribeToPlan,
        bookRoute,
        notifyAbsence,
        rateDriver,
        refreshDrivers,
        refreshRoutes,
        refreshHistory,
        availableRoutes,
        myDriverRoutes,
        createRoute,
        updateRoute,
        deleteRoute,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
