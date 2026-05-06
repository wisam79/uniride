import React, { createContext, useState, useContext, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";

export interface NotificationData {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface AppNotification {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

interface NotificationContextValue {
  notifications: NotificationData[];
  appNotifications: AppNotification[];
  unreadNotificationCount: number;
  notify: (message: string, type?: AppNotification["type"]) => void;
  dismissNotification: (id: string) => void;
  markNotificationRead: (id: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);

  const unreadNotificationCount = notifications.filter((n) => !n.is_read).length;

  function notify(message: string, type: AppNotification["type"] = "info") {
    const id = Math.random().toString(36).slice(2);
    setAppNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setAppNotifications((prev) => prev.filter((n) => n.id !== id)), 4000);
  }

  function dismissNotification(id: string) {
    setAppNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  async function markNotificationRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setNotifications(data as NotificationData[]);
  }, [user]);

  const value: NotificationContextValue = {
    notifications,
    appNotifications,
    unreadNotificationCount,
    notify,
    dismissNotification,
    markNotificationRead,
    fetchNotifications,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within NotificationProvider");
  return ctx;
}
