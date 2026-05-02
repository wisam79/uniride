import FeatherIcon from "@/components/FeatherIcon";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useMemo } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TripMap } from "@/components/TripMap";
import { TripStatusCard } from "@/components/TripStatusCard";
import { Trip, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function TripTimelineItem({ icon, color, title, subtitle, isLast }: { icon: string; color: string; title: string; subtitle: string; isLast?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineDot, { backgroundColor: color }]} />
        {!isLast && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}
      </View>
      <View style={styles.timelineContent}>
        <Text style={[styles.timelineTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.timelineSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

function TripHistoryItem({ trip, role }: { trip: Trip; role: "student" | "driver" }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  const statusColors: Record<string, string> = {
    completed: colors.success,
    cancelled: colors.destructive,
    inprogress: colors.primary,
    default: colors.mutedForeground,
  };
  const statusLabels: Record<string, string> = {
    completed: "مكتملة", cancelled: "ملغاة", inprogress: "جارية",
    waiting: "بانتظار", accepted: "مقبولة", pickup: "في الطريق", arrived: "وصل",
  };

  const statusColor = statusColors[trip.status] ?? statusColors.default;
  const date = new Date(trip.startTime);
  
  const arabicDays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const arabicMonths = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  
  const dateStr = `${arabicDays[date.getDay()]}، ${date.getDate()} ${arabicMonths[date.getMonth()]}`;
  const timeStr = date.toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" });

  const originAddr = trip.origin?.address ?? trip.originAddress;
  const destAddr = trip.destination?.address ?? trip.destAddress;

  const otherPersonName = role === "student" ? trip.driverName : trip.studentName;
  const initials = otherPersonName ? otherPersonName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  return (
    <TouchableOpacity
      style={[styles.tripItem, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => setExpanded(!expanded)} activeOpacity={0.8}
    >
      <View style={styles.tripItemTop}>
        <View style={[styles.avatarCircle, { backgroundColor: colors.primary + "15" }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
        </View>
        <View style={styles.tripMain}>
          <View style={styles.routeRow}>
            <Text style={[styles.tripRoute, { color: colors.foreground }]} numberOfLines={1}>
              {originAddr.split("،")[0]}
            </Text>
            <FeatherIcon name="arrow-right" size={12} color={colors.mutedForeground} style={{ marginHorizontal: 4, transform: [{ scaleX: -1 }] }} />
            <Text style={[styles.tripRoute, { color: colors.foreground }]} numberOfLines={1}>
              {destAddr.split("،")[0]}
            </Text>
          </View>
          <Text style={[styles.tripMeta, { color: colors.mutedForeground }]}>{dateStr} · {timeStr}</Text>
        </View>
        <View style={styles.tripRight}>
          <View style={[styles.miniStatus, { backgroundColor: statusColor + "15" }]}>
            <Text style={[styles.miniStatusText, { color: statusColor }]}>{statusLabels[trip.status] ?? trip.status}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
            <Text style={[styles.tripFare, { color: role === "driver" ? colors.success : colors.foreground }]}>
              {role === "driver" ? "+" : ""}{(Number(trip.fare) / 1000).toFixed(0)}k
            </Text>
            <Text style={[styles.tripFareUnit, { color: colors.mutedForeground }]}> د.ع</Text>
          </View>
        </View>
      </View>

      {expanded && (
        <View style={[styles.tripDetails, { borderTopColor: colors.border }]}>
          <TripTimelineItem 
            icon="map-pin" 
            color={colors.success} 
            title="انطلاق" 
            subtitle={originAddr} 
          />
          <TripTimelineItem 
            icon="flag" 
            color={trip.status === "completed" ? colors.accent : colors.mutedForeground} 
            title={trip.status === "completed" ? "وصول" : "الوجهة"} 
            subtitle={destAddr} 
            isLast
          />
          
          <View style={styles.expandFooter}>
             {otherPersonName && (
               <View style={styles.detailRow}>
                 <FeatherIcon name="user" size={14} color={colors.mutedForeground} />
                 <Text style={[styles.detailText, { color: colors.foreground }]}>{otherPersonName}</Text>
               </View>
             )}
             {trip.driverShare != null && role === "driver" && (
                <View style={styles.detailRow}>
                  <FeatherIcon name="dollar-sign" size={14} color={colors.success} />
                  <Text style={[styles.detailText, { color: colors.success, fontFamily: "Inter_600SemiBold" }]}>
                    حصتك الصافية: {(Number(trip.driverShare) / 1000).toFixed(0)}k د.ع
                  </Text>
                </View>
             )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function TripsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, activeTrip, tripHistory, refreshHistory } = useApp();
  const [filter, setFilter] = useState<"all" | "completed" | "cancelled">("all");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshHistory();
    setRefreshing(false);
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const role = user?.role ?? "student";

  const stats = useMemo(() => {
    const completed = tripHistory.filter(t => t.status === "completed").length;
    const cancelled = tripHistory.filter(t => t.status === "cancelled").length;
    const totalValue = tripHistory
      .filter(t => t.status === "completed")
      .reduce((acc, t) => acc + (role === "driver" ? Number(t.driverShare ?? 0) : Number(t.fare)), 0);
    
    return { completed, cancelled, totalValue };
  }, [tripHistory, role]);

  const filteredHistory = useMemo(() => {
    if (filter === "all") return tripHistory;
    return tripHistory.filter(t => t.status === filter);
  }, [tripHistory, filter]);

  const showMap = activeTrip && (
    activeTrip.status === "accepted" ||
    activeTrip.status === "pickup" ||
    activeTrip.status === "inprogress"
  );

  const emptyMessages = {
    all: role === "student" ? "لا توجد رحلات بعد. احجز رحلتك الأولى من الرئيسية" : "لا توجد رحلات بعد. فعّل التوفر لاستقبال الطلبات",
    completed: "لم تكتمل أي رحلة بعد",
    cancelled: "لا توجد رحلات ملغاة",
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#0D2847", "#1A3C6E"]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{role === "student" ? "رحلاتي" : "الرحلات"}</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
            <FeatherIcon name="refresh-cw" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>
          {stats.completed} رحلة مكتملة · {stats.cancelled} ملغاة
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
          <View style={styles.section}>
            {showMap && Platform.OS !== "web" && (
              <TripMap
                originLat={activeTrip.origin?.lat ?? Number(activeTrip.originLat)}
                originLng={activeTrip.origin?.lng ?? Number(activeTrip.originLng)}
                destLat={activeTrip.destination?.lat ?? Number(activeTrip.destLat)}
                destLng={activeTrip.destination?.lng ?? Number(activeTrip.destLng)}
              />
            )}
            <View style={{ padding: 16 }}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الرحلة الحالية</Text>
              <TripStatusCard trip={activeTrip} role={role} />
            </View>
          </View>
        )}

        {tripHistory.length > 0 && (
          <View style={styles.summaryCardWrapper}>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
               <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                    {role === "driver" ? "إجمالي الأرباح" : "إجمالي المصروفات"}
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.primary }]}>
                    {(stats.totalValue / 1000).toLocaleString()}k د.ع
                  </Text>
               </View>
               <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
               <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>هذا الشهر</Text>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>{stats.completed}</Text>
               </View>
            </View>
          </View>
        )}

        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {(["all", "completed", "cancelled"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.filterChip,
                  { backgroundColor: filter === f ? colors.primary : colors.card, borderColor: colors.border }
                ]}
              >
                <Text style={[styles.filterChipText, { color: filter === f ? "#fff" : colors.mutedForeground }]}>
                  {f === "all" ? "الكل" : f === "completed" ? "مكتملة" : "ملغاة"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={[styles.section, { padding: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>سجل الرحلات</Text>
          {filteredHistory.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.emptyIconBg, { backgroundColor: colors.muted + "40" }]}>
                <FeatherIcon name="map" size={32} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد رحلات</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                {emptyMessages[filter]}
              </Text>
            </View>
          ) : (
            filteredHistory.map((trip) => (
              <TripHistoryItem key={trip.id} trip={trip} role={role} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 25 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 4 },
  headerSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  refreshBtn: { padding: 8, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 10 },
  content: { flex: 1 },
  section: { marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 16 },
  
  summaryCardWrapper: { paddingHorizontal: 16, marginTop: -15, marginBottom: 20 },
  summaryCard: { borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryDivider: { width: 1, height: 30, marginHorizontal: 10 },
  summaryLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 4 },
  summaryValue: { fontSize: 18, fontFamily: "Inter_700Bold" },

  filterContainer: { marginBottom: 10 },
  filterScroll: { paddingHorizontal: 16, gap: 10 },
  filterChip: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  tripItem: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8 },
  tripItemTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  tripMain: { flex: 1 },
  routeRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  tripRoute: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  tripMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  tripRight: { alignItems: "flex-end" },
  miniStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  miniStatusText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  tripFare: { fontSize: 16, fontFamily: "Inter_700Bold" },
  tripFareUnit: { fontSize: 11, fontFamily: "Inter_400Regular" },
  
  tripDetails: { borderTopWidth: 1, marginTop: 15, paddingTop: 15 },
  timelineItem: { flexDirection: "row", gap: 12, minHeight: 40 },
  timelineLeft: { alignItems: "center", width: 12 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  timelineLine: { width: 2, flex: 1, marginVertical: 2 },
  timelineContent: { flex: 1, paddingBottom: 15 },
  timelineTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  timelineSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  
  expandFooter: { marginTop: 5, gap: 8 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  
  emptyState: { borderRadius: 20, borderWidth: 1, padding: 40, alignItems: "center", gap: 12 },
  emptyIconBg: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
});

