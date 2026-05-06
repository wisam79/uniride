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
import { router } from "expo-router";

import { SUBSCRIPTION_PLANS, SubscriptionCard } from "@/components/SubscriptionCard";
import { EarningsChart } from "@/components/EarningsChart";
import { useAuth, useSubscription, useTrip } from "@/context";
import { useColors } from "@/hooks/useColors";

export default function SubscriptionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { subscription, subscribeToPlan, cancelSubscription } = useSubscription();
  const { tripHistory } = useTrip();

  const [isCancelling, setIsCancelling] = useState(false);
  const [todayEarnings] = useState(0);
  const [weeklyEarnings] = useState(0);
  const weeklyEarningsData: { week: number; count: number; earnings: number }[] = [];

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
              await cancelSubscription();
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
    const completedTrips = (tripHistory || []).filter((t: any) => t.status === "completed");
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const tripsThisMonth = completedTrips.filter((t: any) => {
      const d = new Date(t.started_at ?? t.trip_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const DRIVER_PAYOUT_PER_TRIP = 70000;

    const weeks = [1, 2, 3, 4].map(w => {
      const weekTrips = tripsThisMonth.filter((t: any) => {
        const d = new Date(t.started_at ?? t.trip_date);
        const day = d.getDate();
        if (w === 1) return day <= 7;
        if (w === 2) return day > 7 && day <= 14;
        if (w === 3) return day > 14 && day <= 21;
        return day > 21;
      });
      return {
        week: w,
        count: weekTrips.length,
        earnings: weekTrips.length * DRIVER_PAYOUT_PER_TRIP
      };
    });

    const monthlyEarnings = tripsThisMonth.length * DRIVER_PAYOUT_PER_TRIP;
    const appCommissionTotal = tripsThisMonth.length * 20000;
    const projectedMonthly = Math.round((weeklyEarnings || 0) / 7 * 30);
    const acceptanceRate = tripHistory && tripHistory.length > 0 
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
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>أداء الأسبوع</Text>
            <EarningsChart data={weeks.map(w => ({ day: `أسبوع ${w.week}`, amount: w.earnings })) || []} />
          </View>

          <View style={styles.section}>
            <View style={[styles.projectedCard, { backgroundColor: colors.success + "15", borderColor: colors.success + "30" }]}>
              <View style={styles.projectedHeader}>
                <FeatherIcon name="trending-up" size={20} color={colors.success} />
                <Text style={[styles.projectedTitle, { color: colors.success }]}>الدخل المتوقع هذا الشهر</Text>
              </View>
              <Text style={[styles.projectedValue, { color: colors.success }]}>{(projectedMonthly / 1000).toFixed(0)}k دينار</Text>
              <Text style={[styles.projectedSub, { color: colors.success }]}>بناءً على متوسط أرباحك الأسبوعية</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>تفصيل أرباح الشهر الحالي</Text>
            <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {weeks.map((w, i) => (
                <View key={w.week} style={[styles.tableRow, i % 2 !== 0 && { backgroundColor: "rgba(0,0,0,0.02)" }]}>
                  <Text style={[styles.tableCell, { flex: 1, color: colors.mutedForeground }]}>الأسبوع {w.week}</Text>
                  <Text style={[styles.tableCell, { flex: 1, color: colors.foreground, textAlign: "center" }]}>{w.count} رحلة</Text>
                  <Text style={[styles.tableCell, { flex: 1, color: colors.success, textAlign: "right", fontFamily: "Inter_700Bold" }]}>{(w.earnings / 1000).toFixed(0)}k</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>نظام العمولات</Text>
            <View style={[styles.commissionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.splitContainer}>
                <View style={[styles.splitBar, { flex: 85, backgroundColor: colors.primary }]}>
                  <Text style={styles.splitText}>85%</Text>
                </View>
                <View style={[styles.splitBar, { flex: 15, backgroundColor: colors.accent }]}>
                  <Text style={styles.splitText}>15%</Text>
                </View>
              </View>
              
              <View style={styles.commissionDetailRow}>
                <View style={styles.commissionItem}>
                  <Text style={[styles.commissionVal, { color: colors.primary }]}>{(monthlyEarnings / 1000).toFixed(0)}k</Text>
                  <Text style={[styles.commissionLabel, { color: colors.mutedForeground }]}>للسائق</Text>
                </View>
                <View style={[styles.commissionDivider, { backgroundColor: colors.border }]} />
                <View style={styles.commissionItem}>
                  <Text style={[styles.commissionVal, { color: colors.accent }]}>{(appCommissionTotal / 1000).toFixed(0)}k</Text>
                  <Text style={[styles.commissionLabel, { color: colors.mutedForeground }]}>للتطبيق</Text>
                </View>
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
        </ScrollView>
      </View>
    );
  }

  const isActive = subscription?.status === "active";
  const daysLeft = subscription
    ? Math.max(0, Math.ceil((new Date(subscription.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const progress = daysLeft / 30;

  const tripsThisMonthCount = (tripHistory || []).filter((t: any) => {
    const d = new Date(t.started_at ?? t.trip_date);
    return d.getMonth() === new Date().getMonth() && t.status === "completed";
  }).length;

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
        {isActive && (
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
                    اشتراك شهري
                  </Text>
                  <Text style={styles.activeSubDriver}>مع السائق</Text>
                  <Text style={styles.expiryDateText}>ينتهي في {new Date(subscription.end_date).toLocaleDateString("ar-IQ")}</Text>
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
                  <Text style={styles.activeSubStatValue}>{tripsThisMonthCount}</Text>
                  <Text style={styles.activeSubStatLabel}>رحلة هذا الشهر</Text>
                </View>
                <View style={styles.activeSubStatDiv} />
                <View style={styles.activeSubStat}>
                  <Text style={styles.activeSubStatValue}>22</Text>
                  <Text style={styles.activeSubStatLabel}>رحلة متبقية</Text>
                </View>
              </View>

              <View style={styles.savingsBanner}>
                <FeatherIcon name="gift" size={14} color={colors.accent} />
                <Text style={styles.savingsText}>وفّرت 35% مقارنة بدفع كل رحلة</Text>
              </View>
            </View>
            
            <View style={styles.studentStatsRow}>
              <View style={[styles.studentStatBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <FeatherIcon name="map" size={18} color={colors.primary} />
                <Text style={[styles.studentStatVal, { color: colors.foreground }]}>{tripsThisMonthCount}</Text>
                <Text style={[styles.studentStatLabel, { color: colors.mutedForeground }]}>رحلات هذا الشهر</Text>
              </View>
              <View style={[styles.studentStatBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <FeatherIcon name="trending-down" size={18} color={colors.success} />
                <Text style={[styles.studentStatVal, { color: colors.success }]}>35%</Text>
                <Text style={[styles.studentStatLabel, { color: colors.mutedForeground }]}>توفير إجمالي</Text>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.activateCardBanner, { borderColor: colors.accent + "60", backgroundColor: colors.accent + "10" }]}
          onPress={() => router.push("/activate-card")}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#FF6B3508", "#FF6B3520"]}
            style={styles.activateCardInner}
          >
            <View style={[styles.activateCardIconBox, { backgroundColor: colors.accent }]}>
              <FeatherIcon name="credit-card" size={22} color="#fff" />
            </View>
            <View style={styles.activateCardText}>
              <Text style={[styles.activateCardTitle, { color: colors.accent }]}>لديك بطاقة اشتراك؟</Text>
              <Text style={[styles.activateCardSub, { color: colors.mutedForeground }]}>أدخل رمز البطاقة لتفعيل اشتراكك فوراً</Text>
            </View>
            <FeatherIcon name="arrow-left" size={20} color={colors.accent} />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {isActive ? "تغيير الخطة" : "اختر خطتك"}
          </Text>
          {SUBSCRIPTION_PLANS.map((plan) => (
            <SubscriptionCard
              key={plan.id}
              plan={plan}
              isActive={isActive}
              onSelect={() => {
                if (subscription?.driver_id) {
                  subscribeToPlan(subscription.driver_id, plan.id as any);
                }
              }}
            />
          ))}
        </View>

        {isActive && (
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
  projectedCard: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: "center" },
  projectedHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  projectedTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  projectedValue: { fontSize: 28, fontFamily: "Inter_800ExtraBold", marginBottom: 4 },
  projectedSub: { fontSize: 11, fontFamily: "Inter_400Regular", opacity: 0.8 },
  tableCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  tableRow: { flexDirection: "row", padding: 16, alignItems: "center" },
  tableCell: { fontSize: 14, fontFamily: "Inter_500Medium" },
  splitContainer: { height: 12, flexDirection: "row", borderRadius: 6, overflow: "hidden", margin: 16 },
  splitBar: { height: "100%", justifyContent: "center", alignItems: "center" },
  splitText: { fontSize: 8, color: "#fff", fontFamily: "Inter_700Bold" },
  commissionCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  commissionDetailRow: { flexDirection: "row", padding: 16 },
  commissionItem: { flex: 1, alignItems: "center" },
  commissionVal: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 2 },
  commissionLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  commissionDivider: { width: 1, height: "100%" },
  studentStatsRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  studentStatBox: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 16, alignItems: "center", gap: 4 },
  studentStatVal: { fontSize: 20, fontFamily: "Inter_700Bold" },
  studentStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
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
  separator: { height: 1, marginHorizontal: 16 },
  cancelButton: { marginTop: 8, padding: 16, alignItems: "center" },
  cancelButtonText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  activateCardBanner: { borderRadius: 16, borderWidth: 1.5, marginBottom: 20, overflow: "hidden" },
  activateCardInner: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  activateCardIconBox: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  activateCardText: { flex: 1 },
  activateCardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "right" },
  activateCardSub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 2 },
});
