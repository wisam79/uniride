import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type UserRole = "student" | "driver";

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  university?: string;
  college?: string;
  studentId?: string;
  vehicleType?: string;
  vehiclePlate?: string;
  vehicleColor?: string;
  rating: number;
  totalTrips: number;
  profileImage?: string;
  isOnline?: boolean;
  balance?: number;
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
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverVehicle?: string;
  driverRating?: number;
  origin: TripLocation;
  destination: TripLocation;
  status: TripStatus;
  startTime: string;
  endTime?: string;
  fare: number;
  driverShare?: number;
  appCommission?: number;
  distance?: number;
  notes?: string;
}

export type SubscriptionPlan = "basic" | "standard" | "premium";

export interface Subscription {
  id: string;
  plan: SubscriptionPlan;
  startDate: string;
  endDate: string;
  isActive: boolean;
  driverId?: string;
  driverName?: string;
  monthlyFare: number;
  tripsPerMonth: number;
  tripsUsed: number;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  vehiclePlate: string;
  vehicleColor: string;
  rating: number;
  totalTrips: number;
  isOnline: boolean;
  location: TripLocation;
  university: string;
  subscriptionPlans: {
    plan: SubscriptionPlan;
    monthlyFare: number;
  }[];
}

interface AppContextValue {
  user: User | null;
  isAuthenticated: boolean;
  activeTrip: Trip | null;
  subscription: Subscription | null;
  tripHistory: Trip[];
  availableDrivers: Driver[];
  todayEarnings: number;
  weeklyEarnings: number;
  pendingRequest: Trip | null;
  isDriverOnline: boolean;
  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  setActiveTrip: (trip: Trip | null) => void;
  setSubscription: (sub: Subscription | null) => void;
  requestTrip: (origin: TripLocation, destination: TripLocation) => void;
  acceptTrip: (tripId: string) => void;
  cancelTrip: (tripId: string) => void;
  completeTrip: (tripId: string) => void;
  updateTripStatus: (tripId: string, status: TripStatus) => void;
  toggleDriverOnline: () => void;
  subscribeToPlan: (driverId: string, plan: SubscriptionPlan) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const MOCK_DRIVERS: Driver[] = [
  {
    id: "d1",
    name: "أحمد محمد الكريمي",
    phone: "07701234567",
    vehicleType: "تويوتا كامري",
    vehiclePlate: "ب 1234 بغداد",
    vehicleColor: "أبيض",
    rating: 4.8,
    totalTrips: 245,
    isOnline: true,
    location: { lat: 33.315, lng: 44.366, address: "المنصور، بغداد" },
    university: "جامعة بغداد",
    subscriptionPlans: [
      { plan: "basic", monthlyFare: 50000 },
      { plan: "standard", monthlyFare: 80000 },
      { plan: "premium", monthlyFare: 120000 },
    ],
  },
  {
    id: "d2",
    name: "علي حسين العبيدي",
    phone: "07809876543",
    vehicleType: "كيا سبورتاج",
    vehiclePlate: "أ 5678 بغداد",
    vehicleColor: "فضي",
    rating: 4.9,
    totalTrips: 189,
    isOnline: true,
    location: { lat: 33.325, lng: 44.376, address: "الكرادة، بغداد" },
    university: "جامعة بغداد",
    subscriptionPlans: [
      { plan: "basic", monthlyFare: 55000 },
      { plan: "standard", monthlyFare: 85000 },
      { plan: "premium", monthlyFare: 130000 },
    ],
  },
  {
    id: "d3",
    name: "محمد صالح الجبوري",
    phone: "07601112233",
    vehicleType: "هيونداي سوناتا",
    vehiclePlate: "ج 9012 بغداد",
    vehicleColor: "رمادي",
    rating: 4.7,
    totalTrips: 312,
    isOnline: true,
    location: { lat: 33.305, lng: 44.356, address: "المشتل، بغداد" },
    university: "الجامعة التكنولوجية",
    subscriptionPlans: [
      { plan: "basic", monthlyFare: 45000 },
      { plan: "standard", monthlyFare: 75000 },
      { plan: "premium", monthlyFare: 110000 },
    ],
  },
];

const MOCK_TRIP_HISTORY: Trip[] = [
  {
    id: "t1",
    studentId: "s1",
    studentName: "سارة علي",
    driverId: "d1",
    driverName: "أحمد محمد الكريمي",
    driverPhone: "07701234567",
    driverVehicle: "تويوتا كامري أبيض",
    driverRating: 4.8,
    origin: { lat: 33.32, lng: 44.37, address: "حي الجامعة، بغداد" },
    destination: { lat: 33.315, lng: 44.366, address: "جامعة بغداد - بوابة 1" },
    status: "completed",
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    fare: 75000,
    driverShare: 65000,
    appCommission: 10000,
    distance: 4.2,
  },
  {
    id: "t2",
    studentId: "s1",
    studentName: "سارة علي",
    driverId: "d2",
    driverName: "علي حسين العبيدي",
    driverPhone: "07809876543",
    driverVehicle: "كيا سبورتاج فضي",
    driverRating: 4.9,
    origin: { lat: 33.315, lng: 44.366, address: "جامعة بغداد - بوابة 1" },
    destination: { lat: 33.32, lng: 44.37, address: "حي الجامعة، بغداد" },
    status: "completed",
    startTime: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 25.5 * 60 * 60 * 1000).toISOString(),
    fare: 75000,
    driverShare: 65000,
    appCommission: 10000,
    distance: 4.2,
  },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTrip, setActiveTripState] = useState<Trip | null>(null);
  const [subscription, setSubscriptionState] = useState<Subscription | null>(null);
  const [tripHistory, setTripHistory] = useState<Trip[]>(MOCK_TRIP_HISTORY);
  const [isDriverOnline, setIsDriverOnline] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<Trip | null>(null);

  useEffect(() => {
    loadStoredData();
  }, []);

  async function loadStoredData() {
    try {
      const [userData, tripData, subData] = await Promise.all([
        AsyncStorage.getItem("user"),
        AsyncStorage.getItem("activeTrip"),
        AsyncStorage.getItem("subscription"),
      ]);
      if (userData) {
        const parsed: User = JSON.parse(userData);
        setUser(parsed);
        setIsAuthenticated(true);
        setIsDriverOnline(parsed.isOnline ?? false);
      }
      if (tripData) setActiveTripState(JSON.parse(tripData));
      if (subData) setSubscriptionState(JSON.parse(subData));
    } catch {
      // ignore
    }
  }

  async function login(userData: User) {
    setUser(userData);
    setIsAuthenticated(true);
    await AsyncStorage.setItem("user", JSON.stringify(userData));
  }

  async function logout() {
    setUser(null);
    setIsAuthenticated(false);
    setActiveTripState(null);
    setSubscriptionState(null);
    await AsyncStorage.multiRemove(["user", "activeTrip", "subscription"]);
  }

  async function updateUser(updates: Partial<User>) {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    await AsyncStorage.setItem("user", JSON.stringify(updated));
  }

  function setActiveTrip(trip: Trip | null) {
    setActiveTripState(trip);
    if (trip) {
      AsyncStorage.setItem("activeTrip", JSON.stringify(trip));
    } else {
      AsyncStorage.removeItem("activeTrip");
    }
  }

  function setSubscription(sub: Subscription | null) {
    setSubscriptionState(sub);
    if (sub) {
      AsyncStorage.setItem("subscription", JSON.stringify(sub));
    } else {
      AsyncStorage.removeItem("subscription");
    }
  }

  function requestTrip(origin: TripLocation, destination: TripLocation) {
    if (!user) return;
    const trip: Trip = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      studentId: user.id,
      studentName: user.name,
      origin,
      destination,
      status: "waiting",
      startTime: new Date().toISOString(),
      fare: 75000,
    };
    setActiveTrip(trip);
    setTimeout(() => {
      const driver = MOCK_DRIVERS[0];
      const updated: Trip = {
        ...trip,
        status: "accepted",
        driverId: driver.id,
        driverName: driver.name,
        driverPhone: driver.phone,
        driverVehicle: `${driver.vehicleType} ${driver.vehicleColor}`,
        driverRating: driver.rating,
      };
      setActiveTrip(updated);
      setTimeout(() => {
        setActiveTrip({ ...updated, status: "pickup" });
        setTimeout(() => {
          setActiveTrip({ ...updated, status: "inprogress" });
        }, 8000);
      }, 6000);
    }, 4000);
  }

  function acceptTrip(tripId: string) {
    if (!pendingRequest || pendingRequest.id !== tripId || !user) return;
    const accepted: Trip = {
      ...pendingRequest,
      driverId: user.id,
      driverName: user.name,
      driverPhone: user.phone,
      status: "accepted",
    };
    setActiveTrip(accepted);
    setPendingRequest(null);
  }

  function cancelTrip(tripId: string) {
    if (activeTrip?.id === tripId) {
      const cancelled: Trip = { ...activeTrip, status: "cancelled" };
      setTripHistory((prev) => [cancelled, ...prev]);
      setActiveTrip(null);
    }
  }

  function completeTrip(tripId: string) {
    if (activeTrip?.id === tripId) {
      const completed: Trip = {
        ...activeTrip,
        status: "completed",
        endTime: new Date().toISOString(),
        driverShare: Math.floor(activeTrip.fare * 0.85),
        appCommission: Math.floor(activeTrip.fare * 0.15),
      };
      setTripHistory((prev) => [completed, ...prev]);
      setActiveTrip(null);
    }
  }

  function updateTripStatus(tripId: string, status: TripStatus) {
    if (activeTrip?.id === tripId) {
      setActiveTrip({ ...activeTrip, status });
    }
  }

  function toggleDriverOnline() {
    const newState = !isDriverOnline;
    setIsDriverOnline(newState);
    updateUser({ isOnline: newState });
    if (newState) {
      setTimeout(() => {
        if (!activeTrip) {
          const student = { id: "s99", name: "فاطمة حسن", phone: "07701112233" };
          const request: Trip = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
            studentId: student.id,
            studentName: student.name,
            origin: { lat: 33.32, lng: 44.37, address: "حي الجامعة، بغداد" },
            destination: { lat: 33.315, lng: 44.366, address: "جامعة بغداد" },
            status: "waiting",
            startTime: new Date().toISOString(),
            fare: 75000,
          };
          setPendingRequest(request);
        }
      }, 5000);
    } else {
      setPendingRequest(null);
    }
  }

  function subscribeToPlan(driverId: string, plan: SubscriptionPlan) {
    const driver = MOCK_DRIVERS.find((d) => d.id === driverId);
    if (!driver || !user) return;
    const planData = driver.subscriptionPlans.find((p) => p.plan === plan);
    if (!planData) return;
    const now = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    const sub: Subscription = {
      id: Date.now().toString(),
      plan,
      startDate: now.toISOString(),
      endDate: end.toISOString(),
      isActive: true,
      driverId: driver.id,
      driverName: driver.name,
      monthlyFare: planData.monthlyFare,
      tripsPerMonth: plan === "basic" ? 20 : plan === "standard" ? 40 : 999,
      tripsUsed: 8,
    };
    setSubscription(sub);
  }

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
    .reduce((sum, t) => sum + (t.driverShare ?? 0), 0);

  const weeklyEarnings = tripHistory
    .filter((t) => {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return t.status === "completed" && new Date(t.startTime).getTime() > weekAgo;
    })
    .reduce((sum, t) => sum + (t.driverShare ?? 0), 0);

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticated,
        activeTrip,
        subscription,
        tripHistory,
        availableDrivers: MOCK_DRIVERS,
        todayEarnings,
        weeklyEarnings,
        pendingRequest,
        isDriverOnline,
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
