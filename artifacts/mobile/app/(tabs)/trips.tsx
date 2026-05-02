import FeatherIcon from "@/components/FeatherIcon";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl, Share, TextInput, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TripMap } from "@/components/TripMap";
import { TripStatusCard } from "@/components/TripStatusCard";
import { Trip, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import RatingModal from "@/components/RatingModal";
import { useRouter } from "expo-router";
import { SearchBar } from "@/components/SearchBar";

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
  const { refreshHistory } = useApp();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [showRating, setShowRating] = useState(false);

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

  // Mock student subscription check (T019.4)
  const isStudentSubscriber = role === "driver" && (trip.id.length % 3 === 0);

  const handleShare = () => {
    Share.share({
      message: `رحلة يونيرايد\n${dateStr}\nمن: ${originAddr}\nإلى: ${destAddr}\nالأجرة: ${(Number(trip.fare) / 1000).toFixed(0)}k دينار`
    });
  };

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
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[styles.tripMeta, { color: colors.mutedForeground }]}>{dateStr} · {timeStr}</Text>
            {isStudentSubscriber && (
              <View style={[styles.subscriberChip, { backgroundColor: colors.primary + "15" }]}>
                <Text style={[styles.subscriberChipText, { color: colors.primary }]}>اشتراك أساسي</Text>
              </View>
            )}
          </View>
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

             <View style={styles.actionRow}>
                <TouchableOpacity onPress={handleShare} style={[styles.actionBtn, { borderColor: colors.border }]}>
                  <FeatherIcon name="share-2" size={14} color={colors.primary} />
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>مشاركة 📤</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => router.push(`/trip-receipt/${trip.id}`)} 
                  style={[styles.actionBtn, { borderColor: colors.border }]}
                >
                  <FeatherIcon name="file-text" size={14} color={colors.primary} />
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>عرض الإيصال 🧾</Text>
                </TouchableOpacity>

                {role === "student" && trip.status === "completed" && !trip.driverRating && (
                  <TouchableOpacity 
                    onPress={() => setShowRating(true)} 
                    style={[styles.actionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  >
                    <FeatherIcon name="star" size={14} color="#fff" />
                    <Text style={[styles.actionBtnText, { color: "#fff" }]}>قيّم السائق ⭐</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  onPress={() => router.push(`/trip-receipt/${trip.id}`)} 
                  style={[styles.actionBtn, { borderColor: colors.border }]}
                >
                  <FeatherIcon name="file-text" size={14} color={colors.primary} />
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>عرض الإيصال</Text>
                </TouchableOpacity>
             </View>
          </View>
        </View>
      )}

      {showRating && (
        <RatingModal
          tripId={trip.id}
          driverName={trip.driverName ?? ""}
          visible={showRating}
          onClose={() => setShowRating(false)}
          onSubmitted={() => {
            setShowRating(false);
            refreshHistory();
          }}
        />
      )}
    </TouchableOpacity>
  );
}

function FilterChip({ 
  label, 
  active, 
  onPress 
}: { 
  label: string; 
  active: boolean; 
  onPress: () => void 
}) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.1, useNativeDriver: true, tension: 100, friction: 5 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 100, friction: 5 }),
      ]).start();
    }
  }, [active]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.filterChip,
          { 
            backgroundColor: active ? colors.primary : colors.card, 
            borderColor: colors.border,
            transform: [{ scale }]
          }
        ]}
      >
        <Text style={[styles.filterChipText, { color: active ? "#fff" : colors.mutedForeground }]}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function TripsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, activeTrip, tripHistory, refreshHistory } = useApp();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "completed" | "cancelled">("all");
  const [search, setSearch] = useState("");
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
    let base = tripHistory;
    if (filter !== "all") {
      base = base.filter(t => t.status === filter);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      base = base.filter(t => {
        const origin = (t.origin?.address ?? t.originAddress ?? "").toLowerCase();
        const dest = (t.destination?.address ?? t.destAddress ?? "").toLowerCase();
        return origin.includes(s) || dest.includes(s);
      });
    }
    return base;
  }, [tripHistory, filter, search]);

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
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="ابحث عن رحلة..."
          />
        </View>
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
                  <View style={[styles.statIconBg, { backgroundColor: colors.success + "15" }]}>
                    <FeatherIcon name="check-circle" size={16} color={colors.success} />
                  </View>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>{stats.completed}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>رحلات مكتملة</Text>
               </View>
               <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
               <View style={styles.summaryItem}>
                  <View style={[styles.statIconBg, { backgroundColor: colors.destructive + "15" }]}>
                    <FeatherIcon name="x-circle" size={16} color={colors.destructive} />
                  </View>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>{stats.cancelled}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>رحلات ملغاة</Text>
               </View>
               <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
               <View style={styles.summaryItem}>
                  <View style={[styles.statIconBg, { backgroundColor: colors.primary + "15" }]}>
                    <FeatherIcon name="dollar-sign" size={16} color={colors.primary} />
                  </View>
                  <Text style={[styles.summaryValue, { color: colors.primary }]}>
                    {(stats.totalValue / 1000).toLocaleString()}k
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                    {role === "driver" ? "إجمالي الأرباح" : "المصروفات"}
                  </Text>
               </View>
            </View>
          </View>
        )}

        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {(["all", "completed", "cancelled"] as const).map((f) => (
              <FilterChip
                key={f}
                label={f === "all" ? "الكل" : f === "completed" ? "مكتملة" : "ملغاة"}
                active={filter === f}
                onPress={() => setFilter(f)}
              />
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
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff" },
  headerSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  refreshBtn: { padding: 8, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 10 },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, paddingHorizontal: 12, height: 44 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: "#fff", fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "right" },
  clearSearch: { padding: 4 },
  content: { flex: 1 },
  section: { marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 16 },
  
  summaryCardWrapper: { paddingHorizontal: 16, marginTop: -20, marginBottom: 20 },
  summaryCard: { borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  summaryItem: { flex: 1, alignItems: "center" },
  statIconBg: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  summaryDivider: { width: 1, height: 40, marginHorizontal: 5 },
  summaryLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  summaryValue: { fontSize: 16, fontFamily: "Inter_700Bold" },

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
  
  subscriberChip: { marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  subscriberChipText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  
  tripDetails: { borderTopWidth: 1, marginTop: 15, paddingTop: 15 },
  timelineItem: { flexDirection: "row", gap: 12, minHeight: 40 },
  timelineLeft: { alignItems: "center", width: 12 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  timelineLine: { width: 2, flex: 1, marginVertical: 2 },
  timelineContent: { flex: 1, paddingBottom: 15 },
  timelineTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  timelineSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  
  expandFooter: { marginTop: 5, gap: 12 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  actionBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  
  emptyState: { borderRadius: 20, borderWidth: 1, padding: 40, alignItems: "center", gap: 12 },
  emptyIconBg: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
});

