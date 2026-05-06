import { TripStatusCard } from "@/components/TripStatusCard";
import EmptyState from "@/components/EmptyState";
import FeatherIcon from "@/components/FeatherIcon";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StatCard } from "@/components/StatCard";
import { RouteCard } from "@/components/RouteCard";
import ScreenWrapper from "@/components/ScreenWrapper";
import { useAuth, useSubscription, useTrip } from "@/context";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";
import { formatIQD } from "@/lib/utils";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { subscription, fetchSubscription } = useSubscription();
  const { activeTrip, tripHistory, fetchTripHistory } = useTrip();
  const router = useRouter();

  const [availableRoutes, setAvailableRoutes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting("صباح الخير");
    else if (hour >= 12 && hour < 18) setGreeting("مساء الخير");
    else if (hour >= 18 && hour < 22) setGreeting("مساء الخير");
    else setGreeting("ليلة سعيدة");
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await fetchSubscription();
      await fetchTripHistory();
      const routes = await api.getAvailableRoutes(user?.institution_id ?? undefined);
      setAvailableRoutes(routes || []);
    } catch {
      setError("تعذر تحميل البيانات");
    } finally {
      setIsLoading(false);
    }
  }, [fetchSubscription, fetchTripHistory, user?.institution_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const completedTrips = (tripHistory || []).filter(
    (t) => t.status === "completed"
  ).length;

  const upcomingTrips = (tripHistory || []).filter(
    (t) => t.status === "scheduled" || t.status === "driver_waiting" || t.status === "in_transit"
  ).length;

  const subscriptionStatusLabel =
    subscription?.status === "active"
      ? "نشط"
      : subscription?.status === "pending"
      ? "قيد الانتظار"
      : "غير مشترك";

  const subscriptionStatusColor =
    subscription?.status === "active"
      ? colors.success
      : subscription?.status === "pending"
      ? colors.warning
      : colors.mutedForeground;

  if (user?.role === "driver") {
    return <Redirect href="/(tabs)/trips" />;
  }

  return (
    <ScreenWrapper
      refreshing={refreshing}
      onRefresh={onRefresh}
      isLoading={isLoading}
      error={error}
      onDismissError={() => setError(null)}
      bottomPadding={insets.bottom + 100}
      contentContainerStyle={{ padding: 0 }}
    >
      <LinearGradient
        colors={["#0D2847", "#1A3C6E"]}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.userName}>{user?.full_name}</Text>
          </View>
          <TouchableOpacity
            style={[styles.subBadge, { backgroundColor: subscriptionStatusColor + "20" }]}
            onPress={() => router.navigate("/(tabs)/subscription")}
          >
            <Text style={[styles.subBadgeText, { color: subscriptionStatusColor }]}>
              {subscriptionStatusLabel}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCardItem, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
            <Text style={styles.statValue}>{completedTrips}</Text>
            <Text style={styles.statLabel}>الرحلات المكتملة</Text>
          </View>
          <View style={[styles.statCardItem, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
            <Text style={styles.statValue}>{upcomingTrips}</Text>
            <Text style={styles.statLabel}>الرحلات القادمة</Text>
          </View>
          <View style={[styles.statCardItem, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
            <Text style={styles.statValue}>
              {subscription?.status === "active"
                ? formatIQD(subscription.monthly_fee).replace(" د.ع", "")
                : "—"}
            </Text>
            <Text style={styles.statLabel}>الاشتراك الشهري</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {activeTrip && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الرحلة الحالية</Text>
            <TripStatusCard trip={activeTrip} role="student" />
          </View>
        )}

        {!activeTrip && !subscription?.status && (
          <TouchableOpacity
            style={[styles.ctaCard, { backgroundColor: colors.primary }]}
            onPress={() => router.navigate("/(tabs)/subscription")}
            activeOpacity={0.9}
          >
            <View>
              <Text style={styles.ctaTitle}>اشترك مع سائق الآن</Text>
              <Text style={styles.ctaSubtitle}>وفر حتى 40% من تكاليف الرحلات</Text>
            </View>
            <FeatherIcon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              الخطوط الشهرية المتاحة
            </Text>
            <TouchableOpacity
              style={[styles.routeCount, { backgroundColor: colors.secondary }]}
              onPress={onRefresh}
            >
              <FeatherIcon name="refresh-cw" size={12} color={colors.primary} />
              <Text style={[styles.routeCountText, { color: colors.primary }]}>
                {availableRoutes.length} خط
              </Text>
            </TouchableOpacity>
          </View>

          {availableRoutes.length > 0 ? (
            availableRoutes.slice(0, 5).map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                onBook={() => {
                  router.navigate("/(tabs)/subscription");
                }}
                isBooked={
                  subscription?.status === "active" &&
                  subscription.driver_id === route.driverId
                }
              />
            ))
          ) : (
            <EmptyState
              icon="map"
              title="لا توجد خطوط متاحة"
              description="لم يُضف أي سائق خطاً بعد"
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            إحصائيات سريعة
          </Text>
          <View style={styles.quickStatsGrid}>
            <StatCard
              label="الرحلات القادمة"
              value={upcomingTrips}
              icon="truck"
              compact
            />
            <StatCard
              label="الرحلات المكتملة"
              value={completedTrips}
              icon="check-circle"
              iconColor={colors.success}
              compact
            />
            <StatCard
              label="حالة الاشتراك"
              value={subscriptionStatusLabel}
              icon="credit-card"
              iconColor={subscriptionStatusColor}
              compact
            />
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    marginBottom: 2,
  },
  userName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  subBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  subBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statCardItem: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  routeCount: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  routeCountText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  ctaCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  ctaTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 4,
  },
  ctaSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  quickStatsGrid: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
});