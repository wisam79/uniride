import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Driver, SubscriptionPlan, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface DriverCardProps {
  driver: Driver;
  onSubscribe: (driver: Driver, plan: SubscriptionPlan) => void;
}

export function DriverCard({ driver, onSubscribe }: DriverCardProps) {
  const colors = useColors();

  function handleSubscribe(plan: SubscriptionPlan) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSubscribe(driver, plan);
  }

  const planLabels: Record<SubscriptionPlan, string> = {
    basic: "أساسي",
    standard: "قياسي",
    premium: "مميز",
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
            {driver.name.charAt(0)}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]}>{driver.name}</Text>
          <Text style={[styles.vehicle, { color: colors.mutedForeground }]}>
            {driver.vehicleType} · {driver.vehicleColor}
          </Text>
          <Text style={[styles.plate, { color: colors.mutedForeground }]}>
            {driver.vehiclePlate}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <View style={[styles.onlineDot, { backgroundColor: driver.isOnline ? colors.success : colors.mutedForeground }]} />
          <Text style={[styles.statusText, { color: driver.isOnline ? colors.success : colors.mutedForeground }]}>
            {driver.isOnline ? "متاح" : "غير متاح"}
          </Text>
        </View>
      </View>

      <View style={[styles.statsRow, { borderColor: colors.border }]}>
        <View style={styles.stat}>
          <Feather name="star" size={14} color={colors.warning} />
          <Text style={[styles.statValue, { color: colors.foreground }]}>{driver.rating}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>التقييم</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Feather name="map" size={14} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.foreground }]}>{driver.totalTrips}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>رحلة</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Feather name="book-open" size={14} color={colors.accent} />
          <Text style={[styles.statValue, { color: colors.foreground }]} numberOfLines={1}>{driver.university.replace("جامعة ", "")}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>الجامعة</Text>
        </View>
      </View>

      <Text style={[styles.plansTitle, { color: colors.mutedForeground }]}>خطط الاشتراك الشهري</Text>
      <View style={styles.plans}>
        {driver.subscriptionPlans.map((p) => (
          <TouchableOpacity
            key={p.plan}
            style={[
              styles.planBtn,
              {
                backgroundColor: p.plan === "premium" ? colors.primary : colors.secondary,
                borderColor: p.plan === "premium" ? colors.primary : colors.border,
              },
            ]}
            onPress={() => handleSubscribe(p.plan)}
            activeOpacity={0.8}
          >
            <Text style={[styles.planName, { color: p.plan === "premium" ? colors.primaryForeground : colors.foreground }]}>
              {planLabels[p.plan]}
            </Text>
            <Text style={[styles.planFare, { color: p.plan === "premium" ? colors.primaryForeground : colors.accent }]}>
              {(p.monthlyFare / 1000).toFixed(0)}k
            </Text>
            <Text style={[styles.planUnit, { color: p.plan === "premium" ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>
              دينار/شهر
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  vehicle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 1,
  },
  plate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  statsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginBottom: 12,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  divider: {
    width: 1,
  },
  plansTitle: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
  },
  plans: {
    flexDirection: "row",
    gap: 8,
  },
  planBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  planName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  planFare: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  planUnit: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
});
