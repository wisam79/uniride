import FeatherIcon from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Animated, LayoutAnimation, Platform, UIManager } from "react-native";

import { Driver, SubscriptionPlan } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface DriverCardProps {
  driver: Driver;
  onSubscribe: (driver: Driver, plan: SubscriptionPlan) => void;
}

export function DriverCard({ driver, onSubscribe }: DriverCardProps) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  function handleSubscribe(plan: SubscriptionPlan) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSubscribe(driver, plan);
  }

  function toggleExpand() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
    Haptics.selectionAsync();
  }

  const plans: { plan: SubscriptionPlan; label: string; fare: number; savings: string; isPopular?: boolean }[] = [
    { plan: "basic", label: "أساسي", fare: driver.basicFare, savings: "20 رحلة" },
    { plan: "standard", label: "قياسي", fare: driver.standardFare, savings: "40 رحلة", isPopular: true },
    { plan: "premium", label: "مميز", fare: driver.premiumFare, savings: "غير محدود" },
  ];

  const rating = Number(driver.rating);
  const stars = [1, 2, 3, 4, 5].map(i => (
    <Text key={i} style={{ color: i <= Math.round(rating) ? "#FFD700" : colors.border, fontSize: 12 }}>
      {i <= Math.round(rating) ? "★" : "☆"}
    </Text>
  ));

  const initials = driver.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity onPress={toggleExpand} activeOpacity={0.7} style={styles.header}>
        <View style={[
          styles.avatar, 
          { 
            backgroundColor: colors.primary,
            borderWidth: 3,
            borderColor: driver.isOnline ? colors.success : colors.mutedForeground
          }
        ]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
            {initials}
          </Text>
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.foreground }]}>{driver.name}</Text>
            {driver.totalTrips > 100 && (
              <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.badgeText, { color: colors.primary }]}>🔥 سائق متمرس</Text>
              </View>
            )}
          </View>
          <View style={styles.ratingRow}>
            {stars}
            <Text style={[styles.ratingValue, { color: colors.mutedForeground }]}>({rating.toFixed(1)})</Text>
          </View>
          <Text style={[styles.vehicle, { color: colors.mutedForeground }]}>
            {driver.vehicleType ?? "—"}{driver.vehicleColor ? ` · ${driver.vehicleColor}` : ""}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.statusBadge}>
            <View style={[styles.onlineDot, { backgroundColor: driver.isOnline ? colors.success : colors.mutedForeground }]} />
            <Text style={[styles.statusText, { color: driver.isOnline ? colors.success : colors.mutedForeground }]}>
              {driver.isOnline ? "متاح" : "غير متاح"}
            </Text>
          </View>
          <FeatherIcon name={expanded ? "chevron-up" : "chevron-down"} size={20} color={colors.mutedForeground} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedContent}>
          <View style={[styles.universityRow, { marginBottom: 12 }]}>
            <FeatherIcon name="book-open" size={14} color={colors.primary} />
            <Text style={[styles.universityText, { color: colors.foreground }]}>
              {driver.university ?? "—"}
            </Text>
          </View>

          <View style={[styles.statsRow, { borderColor: colors.border }]}>
            <View style={styles.stat}>
              <FeatherIcon name="map" size={14} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{driver.totalTrips}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>رحلة</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <FeatherIcon name="user" size={14} color={colors.accent} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{driver.vehiclePlate ?? "—"}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>رقم السيارة</Text>
            </View>
          </View>

          <Text style={[styles.plansTitle, { color: colors.mutedForeground }]}>خطط الاشتراك الشهري</Text>
          <View style={styles.plans}>
            {plans.map((p) => {
              const isPremium = p.plan === "premium";
              const colorsList: [string, string, ...string[]] = ["#1A3C6E", "#0D2847"];

              return (
                <TouchableOpacity
                  key={p.plan}
                  style={[
                    styles.planBtnContainer,
                    !isPremium && { 
                      backgroundColor: colors.secondary,
                      borderColor: colors.border,
                      borderWidth: 1
                    }
                  ]}
                  onPress={() => handleSubscribe(p.plan)}
                  activeOpacity={0.8}
                >
                  {isPremium ? (
                    <LinearGradient 
                      colors={colorsList} 
                      start={{ x: 0, y: 0 }} 
                      end={{ x: 1, y: 1 }} 
                      style={styles.planBtnContent}
                    >
                      <Text style={[styles.planName, { color: colors.primaryForeground }]}>
                        {p.label}
                      </Text>
                      <Text style={[styles.planFare, { color: colors.primaryForeground }]}>
                        {(p.fare / 1000).toFixed(0)}k
                      </Text>
                      <Text style={[styles.planUnit, { color: "rgba(255,255,255,0.7)" }]}>
                        {p.savings}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.planBtnContent}>
                      {p.isPopular && (
                        <View style={[styles.popularBadge, { backgroundColor: colors.accent }]}>
                          <Text style={styles.popularBadgeText}>شائع</Text>
                        </View>
                      )}
                      <Text style={[styles.planName, { color: colors.foreground }]}>
                        {p.label}
                      </Text>
                      <Text style={[styles.planFare, { color: colors.accent }]}>
                        {(p.fare / 1000).toFixed(0)}k
                      </Text>
                      <Text style={[styles.planUnit, { color: colors.mutedForeground }]}>
                        {p.savings}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, overflow: 'hidden' },
  header: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 2 },
  ratingValue: { fontSize: 11, fontFamily: "Inter_400Regular", marginLeft: 4 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20 },
  badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  vehicle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  headerRight: { alignItems: 'flex-end', gap: 8 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  expandedContent: { marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 16 },
  universityRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  universityText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  statsRow: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 10, marginBottom: 12 },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  divider: { width: 1 },
  plansTitle: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 8 },
  plans: { flexDirection: "row", gap: 8 },
  planBtnContainer: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  planBtnContent: { paddingVertical: 12, alignItems: "center", height: '100%' },
  popularBadge: { position: 'absolute', top: -1, right: -1, paddingHorizontal: 6, paddingVertical: 2, borderBottomLeftRadius: 8, borderTopRightRadius: 8 },
  popularBadgeText: { color: '#fff', fontSize: 8, fontFamily: 'Inter_700Bold' },
  planName: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  planFare: { fontSize: 16, fontFamily: "Inter_700Bold" },
  planUnit: { fontSize: 10, fontFamily: "Inter_400Regular" },
});
