import FeatherIcon from "@/components/FeatherIcon";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SUBSCRIPTION_PLANS, SubscriptionCard } from "@/components/SubscriptionCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";

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
    refreshUser,
  } = useApp();

  const [isCancelling, setIsCancelling] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const role = user?.role ?? "student";

  const handleCancelSubscription = async () => {
    if (!subscription?.id) return;

    Alert.alert(
      "إلغاء الاشتراك",
      "هل أنت متأكد من رغبتك في إلغاء الاشتراك؟ ستفقد جميع الميزات بنهاية اليوم.",
      [
        { text: "تراجع", style: "cancel" },
        {
          text: "تأكيد الإلغاء",
          style: "destructive",
          onPress: async () => {
            try {
              setIsCancelling(true);
              await api.delete(`/subscriptions/${subscription.id}`);
              await refreshUser();
              Alert.alert("تم", "تم إلغاء الاشتراك بنجاح");
            } catch (err) {
              Alert.alert("خطأ", "فشل في إلغاء الاشتراك");
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  if (role === "driver") {
    const completedTrips = tripHistory.filter((t) => t.status === "completed");
    const monthlyEarnings = tripHistory
      .filter((t) => {
        const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        return t.status === "completed" && new Date(t.startTime).getTime() > monthAgo;
      })
      .reduce((sum, t) => sum + Number(t.driverShare ?? 0), 0);

    const appCommission = tripHistory
      .filter((t) => t.status === "completed")
      .reduce((sum, t) => sum + Number(t.appCommission ?? 0), 0);

    // Mock data for last 7 days chart
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dayEarnings = tripHistory
        .filter((t) => {
          const tDate = new Date(t.startTime);
          return t.status === "completed" && tDate.toDateString() === date.toDateString();
        })
        .reduce((sum, t) => sum + Number(t.driverShare ?? 0), 0);
      return { day: i, amount: dayEarnings };
    });
    const maxDayAmt = Math.max(...last7Days.map((d) => d.amount), 1);

    const acceptanceRate = tripHistory.length > 0 
      ? Math.round((completedTrips.length / tripHistory.length) * 100) 
      : 100;

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
              <View style={styles.trendRow}>
                <FeatherIcon name="sun" size={16} color="#FFD700" />
                <FeatherIcon name="trending-up" size={12} color={colors.success} />
              </View>
              <Text style={styles.earningValue}>{(todayEarnings / 1000).toFixed(0)}k</Text>
              <Text style={styles.earningLabel}>اليوم (د.ع)</Text>
            </View>
            <View style={[styles.earningBox, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
              <View style={styles.trendRow}>
                <FeatherIcon name="calendar" size={16} color="#5B8DEF" />
                <FeatherIcon name="trending-up" size={12} color={colors.success} />
              </View>
              <Text style={styles.earningValue}>{(weeklyEarnings / 1000).toFixed(0)}k</Text>
              <Text style={styles.earningLabel}>الأسبوع (د.ع)</Text>
            </View>
            <View style={[styles.earningBox, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
              <View style={styles.trendRow}>
                <FeatherIcon name="trending-up" size={16} color="#22C55E" />
                <FeatherIcon name="trending-up" size={12} color={colors.success} />
              </View>
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
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>أرباح آخر 7 أيام</Text>
            <View style={[styles.chartContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.chartBars}>
                {last7Days.map((d, i) => (
                  <View key={i} style={styles.chartBarCol}>
                    <View style={styles.chartBarBg}>
                      <View 
                        style={[
                          styles.chartBarFill, 
                          { 
                            height: `${(d.amount / maxDayAmt) * 100}%`,
                            backgroundColor: i === 6 ? colors.accent : colors.primary 
                          }
                        ]} 
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

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
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>{acceptanceRate}%</Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>نسبة القبول</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>3,500</Text>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>سعر كم (د.ع)</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>نظام العمولات</Text>
            <View style={[styles.commissionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.donutContainer}>
                <View style={[styles.donutSegment, { flex: 85, backgroundColor: colors.primary }]} />
                <View style={[styles.donutSegment, { flex: 15, backgroundColor: colors.accent }]} />
              </View>
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
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>آخر 10 رحلات</Text>
            {tripHistory.slice(0, 10).map((trip) => (
              <View key={trip.id} style={[styles.earningItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.earningItemIcon, { backgroundColor: colors.primary + "15" }]}>
                  <Text style={{ color: colors.primary, fontSize: 16, fontFamily: "Inter_600SemiBold" }}>
                    {trip.studentName?.charAt(0) || "S"}
                  </Text>
                </View>
                <View style={styles.earningItemInfo}>
                  <Text style={[styles.earningItemStudent, { color: colors.foreground }]}>{trip.studentName}</Text>
                  <Text style={[styles.earningItemDate, { color: colors.mutedForeground }]}>
                    {new Date(trip.startTime).toLocaleDateString("ar-IQ")}
                  </Text>
                </View>
                <View style={styles.earningItemRight}>
                  <Text style={[styles.earningItemAmt, { color: colors.success }]}>
                    +{(Number(trip.driverShare ?? 0) / 1000).toFixed(0)}k
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

  const daysLeft = subscription
    ? Math.max(0, Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const progress = daysLeft / 30;

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
              {daysLeft < 5 && (
                <View style={[styles.warningBanner, { backgroundColor: colors.warning }]}>
                  <FeatherIcon name="alert-triangle" size={14} color="#fff" />
                  <Text style={styles.warningText}>اشتراكك ينتهي قريباً</Text>
                </View>
              )}
              <View style={styles.activeSubTop}>
                <View>
                  <Text style={styles.activeSubPlan}>
                    {subscription.plan === "basic" ? "الأساسي" : subscription.plan === "standard" ? "القياسي" : "المميز"}
                  </Text>
                  <Text style={styles.activeSubDriver}>مع {subscription.driverName}</Text>
                  <Text style={styles.expiryDateText}>ينتهي في {new Date(subscription.endDate).toLocaleDateString("ar-IQ")}</Text>
                </View>
                <View style={styles.ringContainer}>
                  <View style={[styles.ringOuter, { borderColor: "rgba(255,255,255,0.2)" }]} />
                  <View 
                    style={[
                      styles.ringInner, 
                      { 
                        borderColor: colors.accent,
                        transform: [{ rotate: `${(1 - progress) * 360}deg` }] 
                      }
                    ]} 
                  />
                  <Text style={styles.ringText}>{daysLeft}</Text>
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

              <View style={styles.savingsBanner}>
                <FeatherIcon name="gift" size={14} color={colors.accent} />
                <Text style={styles.savingsText}>وفّرت 35% مقارنة بدفع كل رحلة</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>مقارنة الخطط</Text>
          <View style={[styles.comparisonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.comparisonHeader}>
              <Text style={[styles.comparisonLabel, { flex: 2, color: colors.mutedForeground }]}>الميزة</Text>
              <Text style={[styles.comparisonLabel, { color: colors.mutedForeground }]}>أساسي</Text>
              <Text style={[styles.comparisonLabel, { color: colors.mutedForeground }]}>قياسي</Text>
              <Text style={[styles.comparisonLabel, { color: colors.mutedForeground }]}>مميز</Text>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={[styles.comparisonText, { flex: 2, color: colors.foreground }]}>الرحلات</Text>
              <Text style={[styles.comparisonText, { color: colors.foreground }]}>20</Text>
              <Text style={[styles.comparisonText, { color: colors.foreground }]}>45</Text>
              <Text style={[styles.comparisonText, { color: colors.foreground }]}>∞</Text>
            </View>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <View style={styles.comparisonRow}>
              <Text style={[styles.comparisonText, { flex: 2, color: colors.foreground }]}>أولوية</Text>
              <Text style={[styles.comparisonText, { color: colors.foreground }]}>-</Text>
              <Text style={[styles.comparisonText, { color: colors.foreground }]}>✓</Text>
              <Text style={[styles.comparisonText, { color: colors.foreground }]}>عالية</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {subscription?.isActive ? "تغيير الخطة" : "اختر خطتك"}
          </Text>
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

        {subscription?.isActive && (
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={handleCancelSubscription}
            disabled={isCancelling}
          >
            <Text style={[styles.cancelButtonText, { color: colors.destructive }]}>
              {isCancelling ? "جاري الإلغاء..." : "إلغاء الاشتراك"}
            </Text>
          </TouchableOpacity>
        )}
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
  earningValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  earningLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", textAlign: "center" },
  trendRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 4 },
  content: { flex: 1 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
  summaryCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
  summaryRow: { flexDirection: "row", justifyContent: "space-around" },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryValue: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  summaryDivider: { width: 1 },
  chartContainer: { borderRadius: 16, borderWidth: 1, padding: 16, height: 120 },
  chartBars: { flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 8, justifyContent: "space-around" },
  chartBarCol: { flex: 1, height: "100%" },
  chartBarBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 4, overflow: "hidden", justifyContent: "flex-end" },
  chartBarFill: { width: "100%", borderRadius: 4 },
  commissionCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  donutContainer: { height: 8, flexDirection: "row" },
  donutSegment: { height: "100%" },
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
  warningBanner: { flexDirection: "row", alignItems: "center", gap: 6, padding: 8, borderRadius: 8, marginBottom: 12 },
  warningText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  activeSubTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  activeSubPlan: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 2 },
  activeSubDriver: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  expiryDateText: { fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 4 },
  ringContainer: { width: 60, height: 60, alignItems: "center", justifyContent: "center" },
  ringOuter: { position: "absolute", width: 60, height: 60, borderRadius: 30, borderWidth: 4 },
  ringInner: { position: "absolute", width: 60, height: 60, borderRadius: 30, borderWidth: 4, borderLeftColor: "transparent", borderBottomColor: "transparent" },
  ringText: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  activeSubStats: { flexDirection: "row", marginBottom: 16 },
  activeSubStat: { flex: 1, alignItems: "center" },
  activeSubStatValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  activeSubStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", textAlign: "center" },
  activeSubStatDiv: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  savingsBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.1)", padding: 12, borderRadius: 10 },
  savingsText: { color: "#fff", fontSize: 13, fontFamily: "Inter_500Medium" },
  comparisonCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden", padding: 12 },
  comparisonHeader: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" },
  comparisonLabel: { flex: 1, fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  comparisonRow: { flexDirection: "row", paddingVertical: 12, alignItems: "center" },
  comparisonText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  cancelButton: { marginTop: 8, padding: 16, alignItems: "center" },
  cancelButtonText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
