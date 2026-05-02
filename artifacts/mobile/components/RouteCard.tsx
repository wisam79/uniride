import FeatherIcon from "@/components/FeatherIcon";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { formatIQD } from "@/lib/universities";

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

interface RouteCardProps {
  route: Route;
  onBook?: (route: Route) => void;
  onSelect?: (route: Route) => void;
  isSelected?: boolean;
  isBooked?: boolean;
  compact?: boolean;
}

export function RouteCard({ route, onBook, onSelect, isSelected, isBooked, compact }: RouteCardProps) {
  const colors = useColors();

  const genderLabel =
    route.genderPreference === "female"
      ? "طالبات فقط"
      : route.genderPreference === "male"
      ? "طلاب فقط"
      : null;

  const seatsColor =
    route.availableSeats === 0
      ? colors.destructive
      : route.availableSeats <= 1
      ? "#F59E0B"
      : colors.success;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onSelect?.(route)}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isSelected ? colors.accent : colors.border,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
    >
      {isSelected && (
        <View style={[styles.selectedBadge, { backgroundColor: colors.accent }]}>
          <FeatherIcon name="check" size={10} color="#fff" />
        </View>
      )}

      {genderLabel && (
        <View style={[styles.genderBadge, { backgroundColor: route.genderPreference === "female" ? "#EC4899" : colors.primary }]}>
          <Text style={styles.genderBadgeText}>{genderLabel}</Text>
        </View>
      )}

      <View style={styles.routeHeader}>
        <View style={[styles.driverAvatar, { backgroundColor: colors.secondary }]}>
          <FeatherIcon name="user" size={18} color={colors.primary} />
        </View>
        <View style={styles.driverInfo}>
          <Text style={[styles.driverName, { color: colors.foreground }]}>{route.driverName}</Text>
          {route.vehicleType && (
            <Text style={[styles.vehicleText, { color: colors.mutedForeground }]}>
              {route.vehicleType}{route.vehicleColor ? ` · ${route.vehicleColor}` : ""}
              {route.vehiclePlate ? ` · ${route.vehiclePlate}` : ""}
            </Text>
          )}
        </View>
        <View style={styles.ratingBox}>
          <FeatherIcon name="star" size={12} color="#FFD700" />
          <Text style={[styles.ratingText, { color: colors.foreground }]}>{Number(route.rating).toFixed(1)}</Text>
        </View>
      </View>

      <View style={styles.routePath}>
        <View style={styles.pathDots}>
          <View style={[styles.dot, { backgroundColor: colors.accent }]} />
          <View style={[styles.pathLine, { backgroundColor: colors.border }]} />
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        </View>
        <View style={styles.pathLabels}>
          <Text style={[styles.pathFrom, { color: colors.foreground }]}>{route.fromArea}، {route.fromCity}</Text>
          <Text style={[styles.pathTo, { color: colors.mutedForeground }]}>{route.toUniversity}</Text>
        </View>
      </View>

      <View style={styles.timesRow}>
        <View style={[styles.timeChip, { backgroundColor: colors.secondary }]}>
          <FeatherIcon name="sunrise" size={12} color={colors.primary} />
          <Text style={[styles.timeText, { color: colors.primary }]}>{route.departureMorning}</Text>
        </View>
        <View style={[styles.timeChip, { backgroundColor: colors.secondary }]}>
          <FeatherIcon name="sunset" size={12} color={colors.primary} />
          <Text style={[styles.timeText, { color: colors.primary }]}>{route.departureEvening}</Text>
        </View>
        <View style={[styles.timeChip, { backgroundColor: seatsColor + "20" }]}>
          <FeatherIcon name="users" size={12} color={seatsColor} />
          <Text style={[styles.timeText, { color: seatsColor }]}>
            {route.availableSeats > 0 ? `${route.availableSeats} مقعد` : "مكتمل"}
          </Text>
        </View>
      </View>

      {!compact && (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <View>
            <Text style={[styles.fareLabel, { color: colors.mutedForeground }]}>الاشتراك الشهري</Text>
            <Text style={[styles.fareValue, { color: colors.primary }]}>{formatIQD(Number(route.monthlyFare))}</Text>
          </View>
          {route.availableSeats > 0 && onBook && !isBooked && (
            <TouchableOpacity
              style={[styles.bookBtn, { backgroundColor: colors.accent }]}
              onPress={() => onBook(route)}
              activeOpacity={0.85}
            >
              <Text style={styles.bookBtnText}>احجز مقعداً</Text>
            </TouchableOpacity>
          )}
          {isBooked && (
            <View style={[styles.bookedBadge, { backgroundColor: colors.success + "20" }]}>
              <FeatherIcon name="check-circle" size={14} color={colors.success} />
              <Text style={[styles.bookedText, { color: colors.success }]}>محجوز</Text>
            </View>
          )}
          {route.availableSeats === 0 && !isBooked && (
            <View style={[styles.bookedBadge, { backgroundColor: colors.destructive + "15" }]}>
              <Text style={[styles.bookedText, { color: colors.destructive }]}>لا مقاعد</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    position: "relative",
    overflow: "hidden",
  },
  selectedBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  genderBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  genderBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    marginTop: 4,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  vehicleText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  ratingBox: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  routePath: { flexDirection: "row", gap: 12, marginBottom: 14, alignItems: "center" },
  pathDots: { alignItems: "center", gap: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pathLine: { width: 2, height: 18 },
  pathLabels: { flex: 1, gap: 6 },
  pathFrom: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  pathTo: { fontSize: 13, fontFamily: "Inter_400Regular" },
  timesRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
  },
  fareLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  fareValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  bookBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bookBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  bookedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bookedText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
