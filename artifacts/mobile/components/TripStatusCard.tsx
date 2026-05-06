import FeatherIcon from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Linking,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useTrip, type TripData } from "@/context";
import { useColors } from "@/hooks/useColors";

interface TripStatusCardProps {
  trip: TripData;
  role: "student" | "driver";
  onComplete?: () => void;
  onCancel?: () => void;
  studentName?: string;
  driverName?: string;
  driverPhone?: string;
  driverVehicle?: string;
  driverRating?: number;
  fare?: number;
  originAddr?: string;
  destAddr?: string;
}

type TripStatusType = TripData["status"];

const STUDENT_STEPS: { status: TripStatusType; label: string; icon: string }[] = [
  { status: "scheduled", label: "مجدولة", icon: "clock" },
  { status: "driver_waiting", label: "السائق قادم", icon: "truck" },
  { status: "in_transit", label: "في الطريق", icon: "navigation" },
  { status: "completed", label: "وصلت", icon: "check-circle" },
];

const DRIVER_STEPS: { status: TripStatusType; label: string; icon: string }[] = [
  { status: "scheduled", label: "مجدولة", icon: "clock" },
  { status: "driver_waiting", label: "متجه للطالب", icon: "navigation" },
  { status: "in_transit", label: "الرحلة جارية", icon: "truck" },
  { status: "completed", label: "اكتملت", icon: "check-circle" },
];

const STATUS_COLORS: Record<TripStatusType, keyof ReturnType<typeof useColors>> = {
  scheduled: "primary",
  driver_waiting: "warning",
  in_transit: "success",
  completed: "success",
  absent: "destructive",
  cancelled: "destructive",
};

const NEXT_STATUS: Partial<Record<TripStatusType, TripStatusType>> = {
  scheduled: "driver_waiting",
  driver_waiting: "in_transit",
  in_transit: "completed",
};

const DRIVER_STATUS_ACTIONS: Partial<Record<TripStatusType, string>> = {
  scheduled: "التوجه للطالب",
  driver_waiting: "بدء الرحلة",
  in_transit: "إنهاء الرحلة",
};

function getStepIndex(status: TripStatusType, steps: typeof STUDENT_STEPS) {
  return steps.findIndex((s) => s.status === status);
}

export function TripStatusCard({
  trip,
  role,
  onComplete,
  onCancel,
  studentName = "الطالب",
  driverName = "السائق",
  driverPhone = "0770000000",
  driverVehicle = "سيارة",
  driverRating = 5.0,
  fare = 0,
  originAddr = "موقع الانطلاق",
  destAddr = "الوجهة",
}: TripStatusCardProps) {
  const colors = useColors();
  const { cancelTrip, acceptTrip, endTrip } = useTrip();
  const steps = role === "student" ? STUDENT_STEPS : DRIVER_STEPS;
  const currentIdx = getStepIndex(trip.status, steps);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [timeLeft, setTimeLeft] = useState<string>("");
  const targetTime = useRef(Date.now() + 5 * 60 * 1000).current;

  useEffect(() => {
    if (trip.status === "scheduled") {
      const interval = setInterval(() => {
        const now = Date.now();
        const diff = targetTime - now;
        if (diff <= 0) {
          setTimeLeft("0:00");
          clearInterval(interval);
        } else {
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${minutes}:${seconds < 10 ? "0" : ""}${seconds}`);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [trip.status]);

  useEffect(() => {
    if (trip.status !== "completed" && trip.status !== "cancelled") {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [trip.status]);

  const statusColorKey = STATUS_COLORS[trip.status] ?? "primary";
  const currentColor =
    colors[statusColorKey] ?? colors.primary;

  function handleCallDriver() {
    Linking.openURL(`tel:${driverPhone}`);
  }

  function performCancel() {
    cancelTrip(trip.id);
    onCancel?.();
  }

  function handleCancel() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert("إلغاء الرحلة", "يرجى اختيار سبب الإلغاء:", [
      { text: "السائق تأخر", onPress: () => performCancel() },
      { text: "غيّرت رأيي", onPress: () => performCancel() },
      { text: "سبب آخر", onPress: () => performCancel() },
      { text: "تراجع", style: "cancel" },
    ]);
  }

  async function handleNextStatus() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next = NEXT_STATUS[trip.status];
    if (!next) return;

    try {
      await updateTripStatus(trip.id, next);
    } catch {
      Alert.alert("خطأ", "فشل تحديث حالة الرحلة");
    }
  }

  function handleShareTrip() {
    Share.share({
      message: `أنا في رحلة يونيرايد\nمن: ${originAddr}\nإلى: ${destAddr}\nالسائق: ${driverName}`,
    });
  }

  if (trip.status === "completed") {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.success + "40" }]}>
        <View style={[styles.completedBanner, { backgroundColor: colors.success + "15" }]}>
          <FeatherIcon name="check-circle" size={24} color={colors.success} />
          <Text style={[styles.completedText, { color: colors.success }]}>وصلت بأمان</Text>
        </View>
        <View style={styles.routeRow}>
          <FeatherIcon name="map-pin" size={12} color={colors.success} />
          <Text style={[styles.routeText, { color: colors.mutedForeground }]} numberOfLines={1}>
            {originAddr}
          </Text>
          <FeatherIcon name="arrow-left" size={12} color={colors.mutedForeground} />
          <FeatherIcon name="flag" size={12} color={colors.accent} />
          <Text style={[styles.routeText, { color: colors.mutedForeground }]} numberOfLines={1}>
            {destAddr}
          </Text>
        </View>
        <View style={[styles.stepsRow, { justifyContent: "center" }]}>
          {steps.map((step, idx) => {
            const isDone = idx <= currentIdx;
            return (
              <React.Fragment key={step.status}>
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      {
                        backgroundColor: isDone ? colors.success : colors.muted,
                        borderColor: isDone ? colors.success : colors.border,
                      },
                    ]}
                  >
                    <FeatherIcon
                      name={isDone ? "check" : step.icon as any}
                      size={12}
                      color={isDone ? "#fff" : colors.mutedForeground}
                    />
                  </View>
                  <Text style={[styles.stepLabel, { color: isDone ? colors.success : colors.mutedForeground }]}>
                    {step.label}
                  </Text>
                </View>
                {idx < steps.length - 1 && (
                  <View
                    style={[
                      styles.connector,
                      { backgroundColor: idx < currentIdx ? colors.success : colors.border },
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>
    );
  }

  if (trip.status === "cancelled") {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.destructive + "40" }]}>
        <View style={[styles.completedBanner, { backgroundColor: colors.destructive + "15" }]}>
          <FeatherIcon name="x-circle" size={24} color={colors.destructive} />
          <Text style={[styles.completedText, { color: colors.destructive }]}>الرحلة ملغاة</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.routeRow}>
        <FeatherIcon name="map-pin" size={12} color={colors.success} />
        <Text style={[styles.routeText, { color: colors.mutedForeground }]} numberOfLines={1}>
          {originAddr}
        </Text>
        <FeatherIcon name="arrow-left" size={12} color={colors.mutedForeground} />
        <FeatherIcon name="flag" size={12} color={colors.accent} />
        <Text style={[styles.routeText, { color: colors.mutedForeground }]} numberOfLines={1}>
          {destAddr}
        </Text>
      </View>

      <View style={[styles.statusBadge, { backgroundColor: currentColor + "20" }]}>
        <View style={[styles.dot, { backgroundColor: currentColor as any }]} />
        <Text style={[styles.statusText, { color: currentColor as any }]}>
          {steps[currentIdx]?.label ?? "جارٍ..."}
        </Text>
        {trip.status === "scheduled" && timeLeft ? (
          <Text style={[styles.etaText, { color: colors.mutedForeground }]}>
            · {timeLeft} دق
          </Text>
        ) : trip.status === "driver_waiting" ? (
          <Text style={[styles.etaText, { color: colors.mutedForeground }]}>
            · ~3 دق
          </Text>
        ) : trip.status === "in_transit" ? (
          <Text style={[styles.etaText, { color: colors.mutedForeground }]}>
            · جارية
          </Text>
        ) : null}
      </View>

      <View style={styles.stepsRow}>
        {steps.map((step, idx) => {
          const isActive = idx === currentIdx;
          const isDone = idx < currentIdx;
          const stepColor = isDone || isActive ? currentColor : colors.muted;

          return (
            <React.Fragment key={step.status}>
              <View style={styles.stepItem}>
                <Animated.View
                  style={[
                    styles.stepCircle,
                    {
                      backgroundColor: (isDone || isActive ? stepColor : "transparent") as any,
                      borderColor: (isDone || isActive ? stepColor : colors.border) as any,
                      borderWidth: isDone || isActive ? 2 : 1.5,
                      transform: isActive ? [{ scale: pulseAnim }] : [],
                    },
                  ]}
                >
                  <FeatherIcon
                    name={isDone ? "check" : step.icon as any}
                    size={11}
                    color={isDone || isActive ? "#fff" : colors.mutedForeground}
                  />
                </Animated.View>
                <Text
                  style={[
                    styles.stepLabel,
                    {
                      color: isDone || isActive ? colors.foreground : colors.mutedForeground,
                      fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                  numberOfLines={2}
                >
                  {step.label}
                </Text>
              </View>
              {idx < steps.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    {
                      backgroundColor: (idx < currentIdx ? currentColor : colors.border) as any
,
                    },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {role === "driver" && (
        <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
          <FeatherIcon name="user" size={14} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.foreground }]}>{studentName}</Text>
          <FeatherIcon name="map-pin" size={14} color={colors.accent} />
          <Text style={[styles.infoText, { color: colors.foreground }]} numberOfLines={1}>
            {destAddr}
          </Text>
        </View>
      )}

      {role === "student" && (
        <View style={[styles.driverInfo, { borderTopColor: colors.border }]}>
          <View style={[styles.driverAvatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.driverAvatarText, { color: "#fff" }]}>
              {driverName.charAt(0)}
            </Text>
          </View>
          <View style={styles.driverDetails}>
            <Text style={[styles.driverName, { color: colors.foreground }]}>{driverName}</Text>
            <Text style={[styles.driverVehicle, { color: colors.mutedForeground }]}>
              {driverVehicle}
            </Text>
          </View>
          <View style={styles.driverRating}>
            <FeatherIcon name="star" size={12} color={colors.warning} />
            <Text style={[styles.ratingText, { color: colors.foreground }]}>
              {driverRating}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.callBtn, { backgroundColor: colors.success + "15" }]}
            onPress={handleCallDriver}
          >
            <FeatherIcon name="phone" size={16} color={colors.success} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.actions}>
        {role === "driver" && DRIVER_STATUS_ACTIONS[trip.status] && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: currentColor as any }]}
            onPress={handleNextStatus}
            activeOpacity={0.85}
          >
            <FeatherIcon
              name={
                trip.status === "scheduled"
                  ? "navigation"
                  : trip.status === "driver_waiting"
                  ? "play"
                  : "flag"
              }
              size={16}
              color="#fff"
            />
            <Text style={styles.primaryBtnText}>
              {DRIVER_STATUS_ACTIONS[trip.status]}
            </Text>
          </TouchableOpacity>
        )}

        {role === "student" && (
          <TouchableOpacity onPress={handleShareTrip} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
            <FeatherIcon name="share-2" size={14} color={colors.primary} />
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>مشاركة الرحلة</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.cancelBtn, { borderColor: colors.destructive }]}
          onPress={handleCancel}
          activeOpacity={0.8}
        >
          <Text style={[styles.cancelBtnText, { color: colors.destructive }]}>إلغاء الرحلة</Text>
        </TouchableOpacity>
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
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    gap: 12,
  },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 12,
    paddingVertical: 14,
  },
  completedText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  routeText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  etaText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepItem: {
    alignItems: "center",
    width: 60,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  stepLabel: {
    fontSize: 9,
    textAlign: "center",
  },
  connector: {
    flex: 1,
    height: 2,
    marginTop: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
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
    gap: 10,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  driverAvatarText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
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
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    gap: 8,
    paddingTop: 4,
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  secondaryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
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