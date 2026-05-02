import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TripMap } from "@/components/TripMap";

import { TripStatusCard } from "@/components/TripStatusCard";
import { Trip, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

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
    completed: "مكتملة",
    cancelled: "ملغاة",
    inprogress: "جارية",
    waiting: "بانتظار",
    accepted: "مقبولة",
    pickup: "في الطريق",
    arrived: "وصل",
  };

  const statusColor = statusColors[trip.status] ?? statusColors.default;

  const date = new Date(trip.startTime);
  const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  const timeStr = date.toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" });

  return (
    <TouchableOpacity
      style={[styles.tripItem, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.8}
    >
      <View style={styles.tripItemTop}>
        <View style={[styles.tripIcon, { backgroundColor: statusColor + "20" }]}>
          <Feather name={trip.status === "completed" ? "check-circle" : trip.status === "cancelled" ? "x-circle" : "truck"} size={18} color={statusColor} />
        </View>
        <View style={styles.tripMain}>
          <Text style={[styles.tripRoute, { color: colors.foreground }]} numberOfLines={1}>
            {trip.origin.address.replace("، بغداد", "")} → {trip.destination.address.replace("، بغداد", "")}
          </Text>
          <Text style={[styles.tripMeta, { color: colors.mutedForeground }]}>
            {dateStr} · {timeStr}
          </Text>
        </View>
        <View style={styles.tripRight}>
          <Text style={[styles.tripFare, { color: colors.accent }]}>
            {(trip.fare / 1000).toFixed(0)}k
          </Text>
          <Text style={[styles.tripFareUnit, { color: colors.mutedForeground }]}>د.ع</Text>
        </View>
      </View>

      {expanded && (
        <View style={[styles.tripDetails, { borderColor: colors.border }]}>
          {role === "student" && trip.driverName && (
            <View style={styles.detailRow}>
              <Feather name="user" size={13} color={colors.mutedForeground} />
              <Text style={[styles.detailText, { color: colors.foreground }]}>{trip.driverName}</Text>
            </View>
          )}
          {role === "driver" && trip.studentName && (
            <View style={styles.detailRow}>
              <Feather name="user" size={13} color={colors.mutedForeground} />
              <Text style={[styles.detailText, { color: colors.foreground }]}>{trip.studentName}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Feather name="map-pin" size={13} color={colors.success} />
            <Text style={[styles.detailText, { color: colors.foreground }]}>{trip.origin.address}</Text>
          </View>
          <View style={styles.detailRow}>
            <Feather name="flag" size={13} color={colors.accent} />
            <Text style={[styles.detailText, { color: colors.foreground }]}>{trip.destination.address}</Text>
          </View>
          {trip.driverShare !== undefined && (
            <View style={styles.detailRow}>
              <Feather name="dollar-sign" size={13} color={colors.primary} />
              <Text style={[styles.detailText, { color: colors.foreground }]}>
                {role === "driver"
                  ? `حصتك: ${(trip.driverShare / 1000).toFixed(0)}k د.ع`
                  : `المدفوع: ${(trip.fare / 1000).toFixed(0)}k د.ع`}
              </Text>
            </View>
          )}
          <View style={[styles.statusTag, { backgroundColor: statusColor + "20" }]}>
            <Text style={[styles.statusTagText, { color: statusColor }]}>
              {statusLabels[trip.status] ?? trip.status}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function TripsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, activeTrip, tripHistory } = useApp();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const role = user?.role ?? "student";

  const hasMap = activeTrip && Platform.OS !== "web";

  const showMap =
    activeTrip &&
    (activeTrip.status === "accepted" ||
      activeTrip.status === "pickup" ||
      activeTrip.status === "inprogress");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#0D2847", "#1A3C6E"]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <Text style={styles.headerTitle}>{role === "student" ? "رحلاتي" : "الرحلات"}</Text>
        <Text style={styles.headerSub}>{tripHistory.length} رحلة في السجل</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTrip && (
          <View style={styles.section}>
            {showMap && (
              <TripMap
                originLat={activeTrip.origin.lat}
                originLng={activeTrip.origin.lng}
                destLat={activeTrip.destination.lat}
                destLng={activeTrip.destination.lng}
              />
            )}

            <View style={{ padding: 16 }}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الرحلة الحالية</Text>
              <TripStatusCard
                trip={activeTrip}
                role={role}
              />
            </View>
          </View>
        )}

        <View style={[styles.section, { padding: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            سجل الرحلات
          </Text>
          {tripHistory.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="map" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد رحلات بعد</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                {role === "student" ? "احجز رحلتك الأولى من الرئيسية" : "فعّل التوفر لاستقبال الطلبات"}
              </Text>
            </View>
          ) : (
            tripHistory.map((trip) => (
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
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 4 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  content: { flex: 1 },
  section: { marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
  map: { height: 220, width: "100%" },
  mapPlaceholder: { height: 160, alignItems: "center", justifyContent: "center", gap: 10 },
  mapPlaceholderText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  tripItem: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  tripItemTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  tripIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  tripMain: { flex: 1 },
  tripRoute: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  tripMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  tripRight: { alignItems: "flex-end" },
  tripFare: { fontSize: 16, fontFamily: "Inter_700Bold" },
  tripFareUnit: { fontSize: 10, fontFamily: "Inter_400Regular" },
  tripDetails: { borderTopWidth: 1, marginTop: 12, paddingTop: 12, gap: 8 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  statusTag: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
  statusTagText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emptyState: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
