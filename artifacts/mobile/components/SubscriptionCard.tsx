import FeatherIcon from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { SubscriptionPlan } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface Plan {
  id: SubscriptionPlan;
  nameAr: string;
  monthlyFare: number;
  tripsPerMonth: number | "unlimited";
  features: string[];
  isPopular?: boolean;
}

interface SubscriptionCardProps {
  plan: Plan;
  isActive?: boolean;
  onSelect: () => void;
}

export function SubscriptionCard({ plan, isActive, onSelect }: SubscriptionCardProps) {
  const colors = useColors();

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect();
  }

  const bgColor = isActive
    ? colors.primary
    : plan.isPopular
    ? colors.primary + "10"
    : colors.card;

  const textColor = isActive ? colors.primaryForeground : colors.foreground;
  const subTextColor = isActive ? "rgba(255,255,255,0.7)" : colors.mutedForeground;
  const accentColor = isActive ? "#FF9E7A" : colors.accent;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: bgColor,
          borderColor: isActive ? colors.primary : plan.isPopular ? colors.primary + "40" : colors.border,
          borderWidth: isActive || plan.isPopular ? 2 : 1,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      {plan.isPopular && !isActive && (
        <View style={[styles.popularBadge, { backgroundColor: colors.accent }]}>
          <Text style={styles.popularText}>الأكثر طلباً</Text>
        </View>
      )}
      {isActive && (
        <View style={[styles.activeBadge, { backgroundColor: colors.success }]}>
          <FeatherIcon name="check" size={10} color="#fff" />
          <Text style={styles.activeBadgeText}>مفعّل</Text>
        </View>
      )}

      <Text style={[styles.planName, { color: textColor }]}>{plan.nameAr}</Text>

      <View style={styles.priceRow}>
        <Text style={[styles.price, { color: isActive ? "#fff" : colors.accent }]}>
          {(plan.monthlyFare / 1000).toFixed(0)}k
        </Text>
        <View>
          <Text style={[styles.currency, { color: subTextColor }]}>دينار عراقي</Text>
          <Text style={[styles.period, { color: subTextColor }]}>/ شهر</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: isActive ? "rgba(255,255,255,0.2)" : colors.border }]} />

      <Text style={[styles.tripsText, { color: accentColor }]}>
        {plan.tripsPerMonth === "unlimited" ? "رحلات غير محدودة" : `${plan.tripsPerMonth} رحلة / شهر`}
      </Text>

      <View style={styles.features}>
        {plan.features.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <FeatherIcon name="check-circle" size={13} color={accentColor} />
            <Text style={[styles.featureText, { color: textColor }]}>{f}</Text>
          </View>
        ))}
      </View>

      {!isActive && (
        <View style={[styles.selectBtn, { backgroundColor: isActive ? colors.success : colors.primary }]}>
          <Text style={styles.selectBtnText}>اشترك الآن</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export const SUBSCRIPTION_PLANS: Plan[] = [
  {
    id: "basic",
    nameAr: "الأساسي",
    monthlyFare: 50000,
    tripsPerMonth: 20,
    features: [
      "تتبع الرحلة مباشرة",
      "إشعارات الوصول",
      "دعم فني",
    ],
  },
  {
    id: "standard",
    nameAr: "القياسي",
    monthlyFare: 80000,
    tripsPerMonth: 40,
    features: [
      "تتبع الرحلة مباشرة",
      "إشعارات الوصول والمغادرة",
      "أولوية الاستلام",
      "دعم فني متميز",
    ],
    isPopular: true,
  },
  {
    id: "premium",
    nameAr: "المميز",
    monthlyFare: 120000,
    tripsPerMonth: "unlimited",
    features: [
      "رحلات غير محدودة",
      "تتبع مباشر مع الخريطة",
      "أولوية قصوى",
      "مشاركة الموقع للعائلة",
      "دعم على مدار الساعة",
    ],
  },
];

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  popularBadge: {
    position: "absolute",
    top: -1,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  popularText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  activeBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  activeBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  planName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    marginBottom: 12,
  },
  price: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    lineHeight: 36,
  },
  currency: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  period: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  divider: {
    height: 1,
    marginBottom: 10,
  },
  tripsText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 10,
  },
  features: {
    gap: 6,
    marginBottom: 14,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  featureText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  selectBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  selectBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
