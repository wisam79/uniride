import FeatherIcon from "@/components/FeatherIcon";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { SubscriptionPlan } from "@/context";import { useColors } from "@/hooks/useColors";

interface Plan {
  id: SubscriptionPlan;
  nameAr: string;
  monthlyFare: number;
  tripsPerMonth: number | "unlimited";
  features: string[];
  negativeFeatures?: string[];
  isPopular?: boolean;
  savings?: string;
  usersCount: string;
}

interface SubscriptionCardProps {
  plan: Plan;
  isActive?: boolean;
  onSelect: () => void;
}

export function SubscriptionCard({ plan, isActive, onSelect }: SubscriptionCardProps) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    if (plan.id === "premium") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.7,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, []);

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect();
  }

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const isPremium = plan.id === "premium";

  const bgColor = isActive
    ? colors.primary
    : plan.isPopular
    ? colors.primary + "10"
    : colors.card;

  const textColor = isActive || (isPremium && !isActive) ? "#FFFFFF" : colors.foreground;
  const subTextColor = isActive || (isPremium && !isActive) ? "rgba(255,255,255,0.7)" : colors.mutedForeground;
  const accentColor = isActive || (isPremium && !isActive) ? "#FF9E7A" : colors.accent;

  const CardContent = (
    <>
      {plan.isPopular && !isActive && (
        <View style={[styles.popularBadge, { backgroundColor: colors.accent }]}>
          <Text style={styles.popularText}>الأكثر طلباً</Text>
        </View>
      )}
      {plan.id === "premium" && !isActive && (
        <Animated.View style={[styles.offerBadge, { backgroundColor: "#F59E0B", opacity: pulseAnim }]}>
          <Text style={styles.offerText}>عرض محدود</Text>
        </Animated.View>
      )}
      {isActive && (
        <View style={[styles.activeBadge, { backgroundColor: colors.success }]}>
          <FeatherIcon name="check" size={10} color="#fff" />
          <Text style={styles.activeBadgeText}>مفعّل</Text>
        </View>
      )}

      <View style={styles.headerRow}>
        <Text style={[styles.planName, { color: textColor }]}>{plan.nameAr}</Text>
        {plan.savings && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>وفّر {plan.savings}</Text>
          </View>
        )}
      </View>

      <View style={styles.priceRow}>
        <Text style={[styles.price, { color: isActive || isPremium ? "#fff" : colors.accent }]}>
          {(plan.monthlyFare / 1000).toFixed(0)}k
        </Text>
        <View>
          <Text style={[styles.currency, { color: subTextColor }]}>دينار عراقي</Text>
          <Text style={[styles.period, { color: subTextColor }]}>/ شهر</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: isActive || isPremium ? "rgba(255,255,255,0.2)" : colors.border }]} />

      <Text style={[styles.tripsText, { color: accentColor }]}>
        {plan.tripsPerMonth === "unlimited" ? "رحلات غير محدودة" : `${plan.tripsPerMonth} رحلة / شهر`}
      </Text>

      <View style={styles.features}>
        {plan.features.map((f, i) => (
          <View key={`feat-${i}`} style={styles.featureRow}>
            <FeatherIcon name="check-circle" size={13} color={accentColor} />
            <Text style={[styles.featureText, { color: textColor }]}>{f}</Text>
          </View>
        ))}
        {plan.negativeFeatures?.map((f, i) => (
          <View key={`neg-${i}`} style={styles.featureRow}>
            <FeatherIcon name="x-circle" size={13} color={subTextColor} />
            <Text style={[styles.featureText, { color: subTextColor }]}>{f}</Text>
          </View>
        ))}
      </View>

      <View style={styles.socialProof}>
        <FeatherIcon name="users" size={12} color={subTextColor} />
        <Text style={[styles.socialProofText, { color: subTextColor }]}>{plan.usersCount}</Text>
      </View>

      {!isActive && (
        <View style={[styles.selectBtn, { backgroundColor: isPremium ? "rgba(255,255,255,0.2)" : colors.primary, borderWidth: isPremium ? 1 : 0, borderColor: "rgba(255,255,255,0.4)" }]}>
          <Text style={styles.selectBtnText}>اشترك الآن</Text>
        </View>
      )}
    </>
  );

  return (
    <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.card,
          !isPremium && {
            backgroundColor: bgColor,
            borderColor: isActive ? colors.primary : plan.isPopular ? colors.primary + "40" : colors.border,
            borderWidth: isActive || plan.isPopular ? 2 : 1,
          },
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        {isPremium && !isActive ? (
          <LinearGradient
            colors={["#1A3C6E", "#2A5CA8", "#3B7BC8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
          />
        ) : null}
        {CardContent}
      </TouchableOpacity>
    </Animated.View>
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
    negativeFeatures: [
      "أولوية الحجز",
      "دعم 24/7",
    ],
    savings: "40%",
    usersCount: "يستخدمه 847 طالب",
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
      "أولوية الحجز",
    ],
    negativeFeatures: [
      "دعم 24/7",
    ],
    isPopular: true,
    savings: "55%",
    usersCount: "الأكثر شيوعاً - 1,234 طالب",
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
      "أولوية الحجز",
      "دعم 24/7",
    ],
    savings: "70%",
    usersCount: "للطلاب المميزين - 312 طالب",
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
    zIndex: 10,
  },
  popularText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  offerBadge: {
    position: "absolute",
    top: -1,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    zIndex: 10,
  },
  offerText: {
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
    zIndex: 10,
  },
  activeBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  headerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  planName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  savingsBadge: {
    backgroundColor: "#22C55E20",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savingsText: {
    color: "#22C55E",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
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
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 7,
  },
  featureText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    flex: 1,
  },
  socialProof: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    marginBottom: 14,
  },
  socialProofText: {
    fontSize: 11,
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
