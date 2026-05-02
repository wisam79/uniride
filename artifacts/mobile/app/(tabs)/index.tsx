import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DriverCard } from "@/components/DriverCard";
import { TripStatusCard } from "@/components/TripStatusCard";
import { Driver, SubscriptionPlan, TripLocation, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    user,
    availableDrivers,
    activeTrip,
    subscription,
    isDriverOnline,
    pendingRequest,
    todayEarnings,
    weeklyEarnings,
    tripHistory,
    toggleDriverOnline,
    requestTrip,
    acceptTrip,
    cancelTrip,
    subscribeToPlan,
  } = useApp();

  const [showBookModal, setShowBookModal] = useState(false);
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  function handleSubscribe(driver: Driver, plan: SubscriptionPlan) {
    Alert.alert(
      "تأكيد الاشتراك",
      `هل تريد الاشتراك مع ${driver.name} بالخطة ${plan === "basic" ? "الأساسية" : plan === "standard" ? "القياسية" : "المميزة"}؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "اشتراك",
          onPress: () => {
            subscribeToPlan(driver.id, plan);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("تم الاشتراك", "تم تفعيل اشتراكك بنجاح!");
          },
        },
      ]
    );
  }

  function handleBookRide() {
    const origin: TripLocation = {
      lat: 33.32 + Math.random() * 0.01,
      lng: 44.37 + Math.random() * 0.01,
      address: originText.trim() || "موقعي الحالي",
    };
    const dest: TripLocation = {
      lat: 33.315,
      lng: 44.366,
      address: destText.trim() || "جامعة بغداد - البوابة الرئيسية",
    };
    setShowBookModal(false);
    requestTrip(origin, dest);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  const todayTrips = tripHistory.filter((t) => {
    const today = new Date();
    const tripDate = new Date(t.startTime);
    return (
      tripDate.getDate() === today.getDate() &&
      tripDate.getMonth() === today.getMonth() &&
      t.status === "completed"
    );
  }).length;

  if (user?.role === "driver") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={["#0D2847", "#1A3C6E"]}
          style={[styles.driverHeader, { paddingTop: topPad + 16 }]}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>مرحباً بك</Text>
              <Text style={styles.driverName}>{user.name}</Text>
            </View>
            <TouchableOpacity
              style={[styles.onlineToggle, { backgroundColor: isDriverOnline ? colors.success : "rgba(255,255,255,0.15)" }]}
              onPress={toggleDriverOnline}
              activeOpacity={0.85}
            >
              <View style={[styles.toggleDot, { backgroundColor: isDriverOnline ? "#fff" : "rgba(255,255,255,0.4)" }]} />
              <Text style={[styles.toggleText, { color: isDriverOnline ? "#fff" : "rgba(255,255,255,0.7)" }]}>
                {isDriverOnline ? "متاح" : "غير متاح"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValueBig}>{(todayEarnings / 1000).toFixed(0)}k</Text>
              <Text style={styles.statLabelWhite}>أرباح اليوم (د.ع)</Text>
            </View>
            <View style={[styles.statDivider]} />
            <View style={styles.statBox}>
              <Text style={styles.statValueBig}>{todayTrips}</Text>
              <Text style={styles.statLabelWhite}>رحلات اليوم</Text>
            </View>
            <View style={[styles.statDivider]} />
            <View style={styles.statBox}>
              <Text style={styles.statValueBig}>{(weeklyEarnings / 1000).toFixed(0)}k</Text>
              <Text style={styles.statLabelWhite}>الأسبوع (د.ع)</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 100 }}
          showsVerticalScrollIndicator={false}
        >
          {activeTrip && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الرحلة الحالية</Text>
              <TripStatusCard trip={activeTrip} role="driver" />
            </View>
          )}

          {pendingRequest && !activeTrip && (
            <View style={[styles.requestCard, { backgroundColor: colors.primary, borderRadius: 16 }]}>
              <View style={styles.requestHeader}>
                <View style={[styles.pulseDot, { backgroundColor: colors.accent }]} />
                <Text style={styles.requestTitle}>طلب رحلة جديد!</Text>
              </View>
              <Text style={styles.requestStudent}>{pendingRequest.studentName}</Text>
              <View style={styles.requestRoute}>
                <Feather name="map-pin" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.requestAddress} numberOfLines={1}>{pendingRequest.origin.address}</Text>
              </View>
              <View style={styles.requestRoute}>
                <Feather name="flag" size={14} color="#FF9E7A" />
                <Text style={styles.requestAddress} numberOfLines={1}>{pendingRequest.destination.address}</Text>
              </View>
              <Text style={styles.requestFare}>{(pendingRequest.fare / 1000).toFixed(0)}k دينار</Text>
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={[styles.rejectBtn, { borderColor: "rgba(255,255,255,0.3)" }]}
                  onPress={() => cancelTrip(pendingRequest.id)}
                >
                  <Text style={styles.rejectBtnText}>رفض</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.acceptBtn, { backgroundColor: colors.accent }]}
                  onPress={() => acceptTrip(pendingRequest.id)}
                >
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={styles.acceptBtnText}>قبول</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!activeTrip && !pendingRequest && (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name={isDriverOnline ? "clock" : "power"} size={40} color={isDriverOnline ? colors.warning : colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {isDriverOnline ? "بانتظار طلبات الرحلة..." : "أنت غير متاح حالياً"}
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                {isDriverOnline ? "سيصلك إشعار عند وجود طلب رحلة" : "فعّل التوفر لاستقبال طلبات الرحلة"}
              </Text>
              {!isDriverOnline && (
                <TouchableOpacity
                  style={[styles.goOnlineBtn, { backgroundColor: colors.success }]}
                  onPress={toggleDriverOnline}
                >
                  <Text style={styles.goOnlineBtnText}>تفعيل التوفر</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>معلومات المركبة</Text>
            <View style={[styles.vehicleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.vehicleRow}>
                <Feather name="truck" size={16} color={colors.primary} />
                <Text style={[styles.vehicleText, { color: colors.foreground }]}>
                  {user.vehicleType ?? "—"}
                </Text>
              </View>
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
              <View style={styles.vehicleRow}>
                <Feather name="hash" size={16} color={colors.mutedForeground} />
                <Text style={[styles.vehicleText, { color: colors.foreground }]}>
                  {user.vehiclePlate ?? "—"}
                </Text>
              </View>
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
              <View style={styles.vehicleRow}>
                <Feather name="star" size={16} color={colors.warning} />
                <Text style={[styles.vehicleText, { color: colors.foreground }]}>
                  {user.rating.toFixed(1)} / 5.0
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#0D2847", "#1A3C6E"]}
        style={[styles.studentHeader, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>مرحباً</Text>
            <Text style={styles.driverName}>{user?.name}</Text>
            <Text style={styles.universityLabel}>{user?.university}</Text>
          </View>
          <View style={[styles.ratingBadge, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Feather name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingValue}>{user?.rating.toFixed(1)}</Text>
          </View>
        </View>

        {subscription?.isActive ? (
          <View style={[styles.subStatusCard, { backgroundColor: "rgba(34,197,94,0.15)", borderColor: "rgba(34,197,94,0.3)" }]}>
            <View style={[styles.subDot, { backgroundColor: colors.success }]} />
            <View style={styles.subInfo}>
              <Text style={styles.subActiveText}>اشتراك نشط مع {subscription.driverName}</Text>
              <Text style={styles.subTripsText}>
                {subscription.tripsUsed} / {subscription.tripsPerMonth === 999 ? "غير محدود" : subscription.tripsPerMonth} رحلة
              </Text>
            </View>
            <Feather name="check-circle" size={18} color={colors.success} />
          </View>
        ) : (
          <View style={[styles.subStatusCard, { backgroundColor: "rgba(255,107,53,0.15)", borderColor: "rgba(255,107,53,0.3)" }]}>
            <Feather name="alert-circle" size={16} color="#FF9E7A" />
            <Text style={styles.noSubText}>لا يوجد اشتراك نشط</Text>
            <Feather name="chevron-left" size={16} color="#FF9E7A" />
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTrip && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>رحلتك الحالية</Text>
            <TripStatusCard trip={activeTrip} role="student" />
          </View>
        )}

        {!activeTrip && (
          <TouchableOpacity
            style={[styles.bookRideBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowBookModal(true)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#1A3C6E", "#2A5CA8"]}
              style={styles.bookRideBtnInner}
            >
              <View>
                <Text style={styles.bookRideBtnTitle}>احجز رحلة الآن</Text>
                <Text style={styles.bookRideBtnSub}>إلى الجامعة أو من الجامعة</Text>
              </View>
              <View style={[styles.bookRideIcon, { backgroundColor: "#FF6B35" }]}>
                <Feather name="navigation" size={22} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>السائقون المتاحون</Text>
            <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>
              {availableDrivers.filter((d) => d.isOnline).length} متاح
            </Text>
          </View>
          {availableDrivers.map((driver) => (
            <DriverCard key={driver.id} driver={driver} onSubscribe={handleSubscribe} />
          ))}
        </View>
      </ScrollView>

      <Modal visible={showBookModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowBookModal(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>حجز رحلة</Text>
            <View style={{ width: 22 }} />
          </View>
          <View style={styles.modalContent}>
            <View style={styles.field}>
              <View style={[styles.locationDot, { backgroundColor: colors.success }]} />
              <TextInput
                style={[styles.locationInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={originText}
                onChangeText={setOriginText}
                placeholder="موقع الانطلاق (موقعي الحالي)"
                placeholderTextColor={colors.mutedForeground}
                textAlign="right"
              />
            </View>
            <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
            <View style={styles.field}>
              <View style={[styles.locationDot, { backgroundColor: colors.accent }]} />
              <TextInput
                style={[styles.locationInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={destText}
                onChangeText={setDestText}
                placeholder="الوجهة (جامعة بغداد)"
                placeholderTextColor={colors.mutedForeground}
                textAlign="right"
              />
            </View>
            <View style={[styles.fareEstimate, { backgroundColor: colors.secondary }]}>
              <Feather name="tag" size={14} color={colors.primary} />
              <Text style={[styles.fareEstimateText, { color: colors.foreground }]}>
                التكلفة التقديرية: 75,000 دينار
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.confirmBookBtn, { backgroundColor: colors.primary }]}
              onPress={handleBookRide}
            >
              <Text style={styles.confirmBookBtnText}>تأكيد الحجز</Text>
              <Feather name="arrow-left" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  driverHeader: { paddingHorizontal: 20, paddingBottom: 24 },
  studentHeader: { paddingHorizontal: 20, paddingBottom: 24 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", marginBottom: 2 },
  driverName: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  universityLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", marginTop: 2 },
  onlineToggle: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, gap: 6 },
  toggleDot: { width: 8, height: 8, borderRadius: 4 },
  toggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  statBox: { flex: 1, alignItems: "center" },
  statValueBig: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  statLabelWhite: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", textAlign: "center" },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.15)" },
  ratingBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 4 },
  ratingValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  subStatusCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 12, borderWidth: 1, gap: 10 },
  subDot: { width: 8, height: 8, borderRadius: 4 },
  subInfo: { flex: 1 },
  subActiveText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  subTripsText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 2 },
  noSubText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#FF9E7A", textAlign: "center" },
  content: { flex: 1 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
  sectionCount: { fontSize: 13, fontFamily: "Inter_400Regular" },
  bookRideBtn: { borderRadius: 16, marginBottom: 20, overflow: "hidden" },
  bookRideBtnInner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20 },
  bookRideBtnTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 4 },
  bookRideBtnSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  bookRideIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  requestCard: { marginBottom: 20, padding: 20 },
  requestHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  pulseDot: { width: 10, height: 10, borderRadius: 5 },
  requestTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  requestStudent: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 10 },
  requestRoute: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  requestAddress: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", flex: 1 },
  requestFare: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FF9E7A", marginVertical: 12 },
  requestActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  rejectBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  rejectBtnText: { color: "rgba(255,255,255,0.8)", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  acceptBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 12, paddingVertical: 13, gap: 6 },
  acceptBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  emptyState: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 12, marginBottom: 20 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  goOnlineBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  goOnlineBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  vehicleCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  vehicleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  vehicleText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  separator: { height: 1, marginHorizontal: 16 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  modalContent: { padding: 20, gap: 12 },
  field: { flexDirection: "row", alignItems: "center", gap: 12 },
  locationDot: { width: 12, height: 12, borderRadius: 6 },
  locationInput: { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, fontFamily: "Inter_400Regular" },
  routeLine: { width: 2, height: 24, marginLeft: 5 },
  fareEstimate: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10 },
  fareEstimateText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  confirmBookBtn: { borderRadius: 14, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 4 },
  confirmBookBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
