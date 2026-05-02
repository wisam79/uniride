import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Trip, TripStatus, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface TripStatusCardProps {
  trip: Trip;
  role: "student" | "driver";
  onComplete?: () => void;
  onCancel?: () => void;
}

const STUDENT_STEPS: { status: TripStatus; label: string; icon: string }[] = [
  { status: "waiting", label: "بانتظار السائق", icon: "clock" },
  { status: "accepted", label: "السائق في الطريق", icon: "navigation" },
  { status: "pickup", label: "السائق وصل", icon: "map-pin" },
  { status: "inprogress", label: "الرحلة جارية", icon: "truck" },
  { status: "arrived", label: "وصلت!", icon: "check-circle" },
];

const DRIVER_STEPS: { status: TripStatus; label: string; icon: string }[] = [
  { status: "accepted", label: "متجه للاستلام", icon: "navigation" },
  { status: "pickup", label: "انتظار الطالب", icon: "map-pin" },
  { status: "inprogress", label: "الرحلة جارية", icon: "truck" },
  { status: "arrived", label: "الوصول", icon: "check-circle" },
];

function getStepIndex(status: TripStatus, role: "student" | "driver") {
  const steps = role === "student" ? STUDENT_STEPS : DRIVER_STEPS;
  return steps.findIndex((s) => s.status === status);
}

export function TripStatusCard({ trip, role, onComplete, onCancel }: TripStatusCardProps) {
  const colors = useColors();
  const { cancelTrip, completeTrip, updateTripStatus } = useApp();
  const steps = role === "student" ? STUDENT_STEPS : DRIVER_STEPS;
  const currentIdx = getStepIndex(trip.status, role);

  function handleComplete() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeTrip(trip.id);
    onComplete?.();
  }

  function handleCancel() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    cancelTrip(trip.id);
    onCancel?.();
  }

  function handleNextStatus() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextStatuses: Partial<Record<TripStatus, TripStatus>> = {
      accepted: "pickup",
      pickup: "inprogress",
      inprogress: "arrived",
    };
    const next = nextStatuses[trip.status];
    if (next) updateTripStatus(trip.id, next);
    if (trip.status === "arrived") handleComplete();
  }

  const statusColors: Record<TripStatus, string> = {
    waiting: colors.warning,
    accepted: colors.primary,
    pickup: colors.accent,
    inprogress: colors.success,
    arrived: colors.success,
    completed: colors.success,
    cancelled: colors.destructive,
  };

  const currentColor = statusColors[trip.status] ?? colors.primary;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statusBadge, { backgroundColor: currentColor + "20" }]}>
        <View style={[styles.dot, { backgroundColor: currentColor }]} />
        <Text style={[styles.statusText, { color: currentColor }]}>
          {steps[currentIdx]?.label ?? "جارٍ..."}
        </Text>
      </View>

      <View style={styles.stepsRow}>
        {steps.map((step, idx) => (
          <React.Fragment key={step.status}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  {
                    backgroundColor: idx <= currentIdx ? currentColor : colors.muted,
                    borderColor: idx <= currentIdx ? currentColor : colors.border,
                  },
                ]}
              >
                <Feather
                  name={step.icon as any}
                  size={12}
                  color={idx <= currentIdx ? "#fff" : colors.mutedForeground}
                />
              </View>
              <Text style={[styles.stepLabel, { color: idx <= currentIdx ? colors.foreground : colors.mutedForeground }]} numberOfLines={2}>
                {step.label}
              </Text>
            </View>
            {idx < steps.length - 1 && (
              <View style={[styles.connector, { backgroundColor: idx < currentIdx ? currentColor : colors.border }]} />
            )}
          </React.Fragment>
        ))}
      </View>

      {role === "driver" && trip.studentName && (
        <View style={[styles.infoRow, { borderColor: colors.border }]}>
          <Feather name="user" size={14} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.foreground }]}>{trip.studentName}</Text>
          <Feather name="map-pin" size={14} color={colors.accent} />
          <Text style={[styles.infoText, { color: colors.foreground }]} numberOfLines={1}>{trip.destination.address}</Text>
        </View>
      )}

      {role === "student" && trip.driverName && (
        <View style={[styles.driverInfo, { borderColor: colors.border }]}>
          <View style={[styles.driverAvatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.driverAvatarText, { color: "#fff" }]}>{trip.driverName.charAt(0)}</Text>
          </View>
          <View style={styles.driverDetails}>
            <Text style={[styles.driverName, { color: colors.foreground }]}>{trip.driverName}</Text>
            <Text style={[styles.driverVehicle, { color: colors.mutedForeground }]}>{trip.driverVehicle}</Text>
          </View>
          <View style={styles.driverRating}>
            <Feather name="star" size={12} color={colors.warning} />
            <Text style={[styles.ratingText, { color: colors.foreground }]}>{trip.driverRating}</Text>
          </View>
        </View>
      )}

      <View style={styles.actions}>
        {role === "driver" && trip.status !== "arrived" && trip.status !== "completed" && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: currentColor }]}
            onPress={handleNextStatus}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {trip.status === "accepted" ? "وصلت للاستلام" :
               trip.status === "pickup" ? "بدء الرحلة" :
               trip.status === "inprogress" ? "الوصول للجامعة" : "إنهاء الرحلة"}
            </Text>
          </TouchableOpacity>
        )}
        {trip.status !== "completed" && trip.status !== "cancelled" && (
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.destructive }]}
            onPress={handleCancel}
            activeOpacity={0.8}
          >
            <Text style={[styles.cancelBtnText, { color: colors.destructive }]}>إلغاء</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  stepItem: {
    alignItems: "center",
    width: 56,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepLabel: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  connector: {
    flex: 1,
    height: 2,
    marginTop: 13,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  driverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  driverAvatarText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  driverVehicle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  driverRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  actions: {
    gap: 8,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  cancelBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 11,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
