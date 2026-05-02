import FeatherIcon from "@/components/FeatherIcon";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SUBSCRIPTION_PLANS, SubscriptionCard } from "@/components/SubscriptionCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function SubscriptionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    user,
    subscription,
    tripHistory,
    todayEarnings,
    weeklyEarnings,
    availableDrivers,
    subscribeToPlan,
  } = useApp();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const role = user?.role ?? "student";

  if (role === "driver") {
    const completedTrips = tripHistory.filter((t) => t.status === "completed");
    const monthlyEarnings = tripHistory
      .filter((t) => {
        const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        return t.status === "completed" && new Date(t.startTime).getTime() > monthAgo;
      })
      .reduce((sum, t) => sum + (t.driverShare ?? 0), 0);

    const appCommission = tripHistory
      .filter((t) => t.status === "completed")
      .reduce((sum, t) => sum + (t.appCommission ?? 0), 0);

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={["#0D2847", "#1A3C6E"]}
          style={[styles.header, { paddingTop: topPad + 16 }]}
        >
          <Text style={styles.headerTitle}>الأرباح والعمولات</Text>
          <Text style={styles.headerSub}>متابعة دخلك اليومي والشهري</Text>

          <View style={styles.earningsGrid}>
            <View style={[styles.earningBox, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
              <FeatherIcon name="sun" size={18} color="#FFD700" />
              <Text style={styles.earningValue}>{(todayEarnings / 1000).toFixed(0)}k</Text>
              <Text style={styles.earningLabel}>اليوم (د.ع)</Text>
            </View>
            <View style={[styles.earningBox, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
              <FeatherIcon name="calendar" size={18} color="#5B8DEF" />
              <Text style={styles.earningValue}>{(weeklyEarnings / 1000).toFixed(0)}k</Text>
              <Text style={styles.earningLabel}>الأسبوع (د.ع)</Text>
            </View>
            <View style={[styles.earningBox, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
              <FeatherIcon name="trending-up" size={18} color="#22C55E" />
              <Text style={styles.earningValue}>{(monthlyEarnings / 1000).toFixed(0)}k</Text>
              <Text style={styles.earningLabel}>الشهر (د.ع)</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 100 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>ملخص الأداء</Text>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>{completedTrips.length}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>إجمالي الرحلات</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>{user?.rating.toFixed(1)}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>متوسط التقييم</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: colors.destructive }]}>{(appCommission / 1000).toFixed(0)}k</Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>عمولة التطبيق</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>نظام العمولات</Text>
            <View style={[styles.commissionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.commissionRow}>
                <View style={[styles.commissionBadge, { backgroundColor: colors.primary + "15" }]}>
                  <Text style={[styles.commissionPct, { color: colors.primary }]}>85%</Text>
                </View>
                <View style={styles.commissionInfo}>
                  <Text style={[styles.commissionTitle, { color: colors.foreground }]}>حصة السائق</Text>
                  <Text style={[styles.commissionDesc, { color: colors.mutedForeground }]}>من إجمالي قيمة كل رحلة</Text>
                </View>
              </View>
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
              <View style={styles.commissionRow}>
                <View style={[styles.commissionBadge, { backgroundColor: colors.accent + "15" }]}>
                  <Text style={[styles.commissionPct, { color: colors.accent }]}>15%</Text>
                </View>
                <View style={styles.commissionInfo}>
                  <Text style={[styles.commissionTitle, { color: colors.foreground }]}>عمولة التطبيق</Text>
                  <Text style={[styles.commissionDesc, { color: colors.mutedForeground }]}>رسوم خدمة المنصة</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>آخر 5 رحلات</Text>
            {tripHistory.slice(0, 5).map((trip) => (
              <View key={trip.id} style={[styles.earningItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.earningItemIcon, { backgroundColor: colors.primary + "15" }]}>
                  <FeatherIcon name="navigation" size={14} color={colors.primary} />
                </View>
                <View style={styles.earningItemInfo}>
                  <Text style={[styles.earningItemStudent, { color: colors.foreground }]}>{trip.studentName}</Text>
                  <Text style={[styles.earningItemDate, { color: colors.mutedForeground }]}>
                    {new Date(trip.startTime).toLocaleDateString("ar-IQ")}
                  </Text>
                </View>
                <View style={styles.earningItemRight}>
                  <Text style={[styles.earningItemAmt, { color: colors.success }]}>
                    +{((trip.driverShare ?? 0) / 1000).toFixed(0)}k
                  </Text>
                  <Text style={[styles.earningItemUnit, { color: colors.mutedForeground }]}>د.ع</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  const driverForSub = subscription
    ? availableDrivers.find((d) => d.id === subscription.driverId)
    : null;

  const daysLeft = subscription
    ? Math.max(0, Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#0D2847", "#1A3C6E"]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <Text style={styles.headerTitle}>الاشتراك الشهري</Text>
        <Text style={styles.headerSub}>اشترك مع سائق موثوق بسعر ثابت</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {subscription?.isActive && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>اشتراكك الحالي</Text>
            <View style={[styles.activeSubCard, { backgroundColor: colors.primary }]}>
              <View style={styles.activeSubTop}>
                <View>
                  <Text style={styles.activeSubPlan}>
                    {subscription.plan === "basic" ? "الأساسي" : subscription.plan === "standard" ? "القياسي" : "المميز"}
                  </Text>
                  <Text style={styles.activeSubDriver}>مع {subscription.driverName}</Text>
                </View>
                <View style={[styles.activeSubBadge, { backgroundColor: colors.success }]}>
                  <FeatherIcon name="check" size={12} color="#fff" />
                  <Text style={styles.activeSubBadgeText}>نشط</Text>
                </View>
              </View>

              <View style={styles.activeSubStats}>
                <View style={styles.activeSubStat}>
                  <Text style={styles.activeSubStatValue}>{daysLeft}</Text>
                  <Text style={styles.activeSubStatLabel}>يوم متبقي</Text>
                </View>
                <View style={styles.activeSubStatDiv} />
                <View style={styles.activeSubStat}>
                  <Text style={styles.activeSubStatValue}>{subscription.tripsUsed}</Text>
                  <Text style={styles.activeSubStatLabel}>رحلة استُخدمت</Text>
                </View>
                <View style={styles.activeSubStatDiv} />
                <View style={styles.activeSubStat}>
                  <Text style={styles.activeSubStatValue}>
                    {subscription.tripsPerMonth === 999 ? "∞" : subscription.tripsPerMonth - subscription.tripsUsed}
                  </Text>
                  <Text style={styles.activeSubStatLabel}>رحلة متبقية</Text>
                </View>
              </View>

              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: subscription.tripsPerMonth === 999
                        ? "30%"
                        : `${Math.min(100, (subscription.tripsUsed / subscription.tripsPerMonth) * 100)}%`,
                      backgroundColor: colors.accent,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {subscription?.isActive ? "تغيير الخطة" : "اختر خطتك"}
          </Text>
          <View style={[styles.featureNote, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <FeatherIcon name="info" size={14} color={colors.primary} />
            <Text style={[styles.featureNoteText, { color: colors.foreground }]}>
              اشترك مع سائقك المفضل من الرئيسية · الأسعار بالدينار العراقي
            </Text>
          </View>
          {SUBSCRIPTION_PLANS.map((plan) => (
            <SubscriptionCard
              key={plan.id}
              plan={plan}
              isActive={subscription?.plan === plan.id && subscription?.isActive}
              onSelect={() => {
                if (subscription?.driverId) {
                  subscribeToPlan(subscription.driverId, plan.id);
                }
              }}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 4 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  earningsGrid: { flexDirection: "row", gap: 10, marginTop: 16 },
  earningBox: { flex: 1, borderRadius: 12, padding: 14, alignItems: "center", gap: 4 },
  earningValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  earningLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", textAlign: "center" },
  content: { flex: 1 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
  summaryCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
  summaryRow: { flexDirection: "row", justifyContent: "space-around" },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryValue: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  summaryDivider: { width: 1 },
  commissionCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  commissionRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  commissionBadge: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  commissionPct: { fontSize: 18, fontFamily: "Inter_700Bold" },
  commissionInfo: { flex: 1 },
  commissionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  commissionDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  separator: { height: 1, marginHorizontal: 16 },
  earningItem: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, gap: 12 },
  earningItemIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  earningItemInfo: { flex: 1 },
  earningItemStudent: { fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 2 },
  earningItemDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  earningItemRight: { alignItems: "flex-end" },
  earningItemAmt: { fontSize: 15, fontFamily: "Inter_700Bold" },
  earningItemUnit: { fontSize: 10, fontFamily: "Inter_400Regular" },
  activeSubCard: { borderRadius: 16, padding: 20 },
  activeSubTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  activeSubPlan: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 4 },
  activeSubDriver: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  activeSubBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 4 },
  activeSubBadgeText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  activeSubStats: { flexDirection: "row", marginBottom: 14 },
  activeSubStat: { flex: 1, alignItems: "center" },
  activeSubStatValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  activeSubStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", textAlign: "center" },
  activeSubStatDiv: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  progressBarBg: { height: 6, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 3 },
  featureNote: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 14 },
  featureNoteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
