import { TripStatusCard } from "@/components/TripStatusCard";
import FeatherIcon from "@/components/FeatherIcon";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Platform,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ScreenWrapper from "@/components/ScreenWrapper";
import EmptyState from "@/components/EmptyState";
import RatingModal from "@/components/RatingModal";
import { useAuth, useTrip, type TripData } from "@/context";
import { useColors } from "@/hooks/useColors";

const STATUS_MAP: Record<string, { label: string; color: (c: any) => string }> = {
  scheduled: { label: "مجدولة", color: (c) => c.primary },
  driver_waiting: { label: "بانتظار السائق", color: (c) => c.warning },
  in_transit: { label: "جارية", color: (c) => c.success },
  completed: { label: "مكتملة", color: (c) => c.success },
  cancelled: { label: "ملغاة", color: (c) => c.destructive },
  absent: { label: "غائب", color: (c) => c.destructive },
};

function TripHistoryItem({
  trip,
  role,
}: {
  trip: TripData;
  role: "student" | "driver";
}) {
  const colors = useColors();
  const router = useRouter();
  const { fetchTripHistory } = useTrip();
  const [expanded, setExpanded] = useState(false);
  const [showRating, setShowRating] = useState(false);

  const statusInfo = STATUS_MAP[trip.status] ?? {
    label: trip.status,
    color: () => colors.mutedForeground,
  };
  const statusColor = statusInfo.color(colors);

  const date = new Date(trip.started_at ?? trip.trip_date);
  const arabicDays = [
    "الأحد", "الاثنين", "الثلاثاء", "الأربعاء",
    "الخميس", "الجمعة", "السبت",
  ];
  const arabicMonths = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
  ];
  const dateStr = `${arabicDays[date.getDay()]}، ${date.getDate()} ${arabicMonths[date.getMonth()]}`;
  const timeStr = date.toLocaleTimeString("ar-IQ", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const directionLabel = trip.direction === "go" ? "ذهاب" : "إياب";

  const handleShare = () => {
    Share.share({
      message: `رحلة يونيرايد\n${dateStr}\nالاتجاه: ${directionLabel}`,
    });
  };

  return (
    <TouchableOpacity
      style={[styles.tripItem, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.8}
    >
      <View style={styles.tripItemTop}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <View style={styles.tripMain}>
          <View style={styles.routeRow}>
            <FeatherIcon name="map-pin" size={12} color={colors.success} />
            <Text style={[styles.tripRoute, { color: colors.foreground }]}>
              {directionLabel}
            </Text>
          </View>
          <Text style={[styles.tripMeta, { color: colors.mutedForeground }]}>
            {dateStr} · {timeStr}
          </Text>
        </View>
        <View style={styles.tripRight}>
          <View style={[styles.miniStatus, { backgroundColor: statusColor + "15" }]}>
            <Text style={[styles.miniStatusText, { color: statusColor }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>
      </View>

      {expanded && (
        <View style={[styles.tripDetails, { borderTopColor: colors.border }]}>
          <View style={styles.detailRow}>
            <FeatherIcon name="clock" size={14} color={colors.mutedForeground} />
            <Text style={[styles.detailText, { color: colors.foreground }]}>
              {dateStr} · {timeStr}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <FeatherIcon name="navigation" size={14} color={colors.mutedForeground} />
            <Text style={[styles.detailText, { color: colors.foreground }]}>
              {directionLabel}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={handleShare}
              style={[styles.actionBtn, { borderColor: colors.border }]}
            >
              <FeatherIcon name="share-2" size={14} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>مشاركة</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(`/trip-receipt/${trip.id}`)}
              style={[styles.actionBtn, { borderColor: colors.border }]}
            >
              <FeatherIcon name="file-text" size={14} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>الإيصال</Text>
            </TouchableOpacity>
            {role === "student" && trip.status === "completed" && (
              <TouchableOpacity
                onPress={() => setShowRating(true)}
                style={[styles.actionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
              >
                <FeatherIcon name="star" size={14} color="#fff" />
                <Text style={[styles.actionBtnText, { color: "#fff" }]}>تقييم</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {showRating && (
        <RatingModal
          tripId={trip.id}
          driverName="السائق"
          visible={showRating}
          onClose={() => setShowRating(false)}
          onSubmitted={() => {
            setShowRating(false);
            fetchTripHistory();
          }}
        />
      )}
    </TouchableOpacity>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const scale = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.1,
          useNativeDriver: true,
          tension: 100,
          friction: 5,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 5,
        }),
      ]).start();
    }
  }, [active]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View
        style={[
          styles.filterChip,
          {
            backgroundColor: active ? colors.primary : colors.card,
            borderColor: colors.border,
            transform: [{ scale }],
          },
        ]}
      >
        <Text
          style={[
            styles.filterChipText,
            { color: active ? "#fff" : colors.mutedForeground },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function TripsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { activeTrip, tripHistory, fetchTripHistory } = useTrip();

  const [filter, setFilter] = useState<"all" | "completed" | "cancelled" | "scheduled">("all");
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const role = (user?.role === "driver" ? "driver" : "student") as "student" | "driver";

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await fetchTripHistory();
    setIsLoading(false);
  }, [fetchTripHistory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTripHistory();
    setRefreshing(false);
  }, [fetchTripHistory]);

  const stats = useMemo(() => {
    const completed = tripHistory.filter((t) => t.status === "completed").length;
    const cancelled = tripHistory.filter((t) => t.status === "cancelled").length;
    const scheduled = tripHistory.filter(
      (t) => t.status === "scheduled" || t.status === "driver_waiting" || t.status === "in_transit"
    ).length;
    return { completed, cancelled, scheduled };
  }, [tripHistory]);

  const filteredHistory = useMemo(() => {
    if (filter === "all") return tripHistory;
    if (filter === "scheduled")
      return tripHistory.filter(
        (t) => t.status === "scheduled" || t.status === "driver_waiting" || t.status === "in_transit"
      );
    return tripHistory.filter((t) => t.status === filter);
  }, [tripHistory, filter]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <ScreenWrapper
      refreshing={refreshing}
      onRefresh={onRefresh}
      isLoading={isLoading}
      bottomPadding={bottomPad + 100}
      contentContainerStyle={{ padding: 0 }}
    >
      <LinearGradient
        colors={["#0D2847", "#1A3C6E"]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>
            {role === "student" ? "السفرات" : "الرحلات"}
          </Text>
        </View>
        <Text style={styles.headerSub}>
          {stats.completed} مكتملة · {stats.cancelled} ملغاة · {stats.scheduled} قادمة
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {activeTrip && (
          <View style={[styles.activeSection, { padding: 16 }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الرحلة الحالية</Text>
            <TripStatusCard trip={activeTrip} role={role} />
          </View>
        )}

        {tripHistory.length > 0 && (
          <View style={[styles.summaryWrapper, { paddingHorizontal: 16 }]}>
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.success }]}>{stats.completed}</Text>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>مكتملة</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.destructive }]}>{stats.cancelled}</Text>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>ملغاة</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.primary }]}>{stats.scheduled}</Text>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>قادمة</Text>
              </View>
            </View>
          </View>
        )}

        <View style={[styles.filterContainer, { paddingHorizontal: 16 }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {(["all", "scheduled", "completed", "cancelled"] as const).map((f) => (
              <FilterChip
                key={f}
                label={
                  f === "all"
                    ? "الكل"
                    : f === "scheduled"
                    ? "القادمة"
                    : f === "completed"
                    ? "المكتملة"
                    : "الملغاة"
                }
                active={filter === f}
                onPress={() => setFilter(f)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>سجل الرحلات</Text>
          {filteredHistory.length === 0 ? (
            <EmptyState
              icon="clock"
              title="لا توجد رحلات"
              description={
                filter === "all"
                  ? "لا توجد رحلات بعد"
                  : filter === "scheduled"
                  ? "لا توجد رحلات قادمة"
                  : filter === "completed"
                  ? "لم تكتمل أي رحلة بعد"
                  : "لا توجد رحلات ملغاة"
              }
            />
          ) : (
            filteredHistory.map((trip) => (
              <TripHistoryItem key={trip.id} trip={trip} role={role} />
            ))
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 25,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  headerSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  content: {
    flex: 1,
  },
  activeSection: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
  },
  summaryWrapper: {
    marginTop: -20,
    marginBottom: 20,
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 5,
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterScroll: {
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  tripItem: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  tripItemTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tripMain: {
    flex: 1,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  tripRoute: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  tripMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  tripRight: {
    alignItems: "flex-end",
  },
  miniStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  miniStatusText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  tripDetails: {
    borderTopWidth: 1,
    marginTop: 15,
    paddingTop: 15,
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});