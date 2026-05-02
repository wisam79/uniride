import FeatherIcon from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useEffect, useRef } from "react";
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DriverCard } from "@/components/DriverCard";
import { TripStatusCard } from "@/components/TripStatusCard";
import EmptyState from "@/components/EmptyState";
import { RouteCard } from "@/components/RouteCard";
import { Driver, Route, SubscriptionPlan, TripLocation, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { IRAQI_UNIVERSITIES } from "@/lib/universities";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    user,
    availableDrivers,
    availableRoutes,
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
    bookRoute,
    notifyAbsence,
    refreshRoutes,
    refreshDrivers,
    estimateFare,
  } = useApp();

  const [showBookModal, setShowBookModal] = useState(false);
  const [showRoutesModal, setShowRoutesModal] = useState(false);
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");
  const [fareEstimate, setFareEstimate] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [routeUniversityFilter, setRouteUniversityFilter] = useState("");
  const [sendingAbsence, setSendingAbsence] = useState(false);
  const [bookingRouteId, setBookingRouteId] = useState<string | null>(null);

  const { useRouter } = require("expo-router");
  const router = useRouter();

  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const countdownAnim = useRef(new Animated.Value(1)).current;
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (subscription?.isActive && subscription.driverId) {
      setSelectedDriverId(subscription.driverId);
    }
  }, [subscription]);

  async function onRefreshDrivers() {
    setRefreshing(true);
    await Promise.all([refreshDrivers(), refreshRoutes()]);
    setRefreshing(false);
  }

  async function handleNotifyAbsence() {
    if (!subscription?.isActive || !subscription.driverId) {
      Alert.alert("تنبيه", "يجب أن يكون لديك اشتراك نشط لإبلاغ عن غياب");
      return;
    }
    Alert.alert(
      "إبلاغ عن غياب",
      "هل تريد إبلاغ سائقك بغيابك اليوم؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إبلاغ",
          onPress: async () => {
            setSendingAbsence(true);
            try {
              await notifyAbsence(subscription.driverId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("تم الإبلاغ", "تم إبلاغ سائقك بغيابك اليوم ✓");
            } catch {
              Alert.alert("خطأ", "تعذر إبلاغ السائق، حاول مرة أخرى");
            } finally {
              setSendingAbsence(false);
            }
          },
        },
      ]
    );
  }

  async function handleBookRoute(route: Route) {
    Alert.alert(
      "حجز مقعد",
      `هل تريد الاشتراك في خط ${route.fromArea} → ${route.toUniversity} مع الكابتن ${route.driverName}؟\nالأجرة الشهرية: ${Number(route.monthlyFare).toLocaleString("ar-IQ")} دينار`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حجز",
          onPress: async () => {
            setBookingRouteId(route.id);
            try {
              await bookRoute(route.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("تم الحجز ✓", "تم تفعيل اشتراكك بنجاح! سيتواصل معك السائق قريباً");
            } catch (err: any) {
              Alert.alert("خطأ", err?.response?.data?.error ?? "فشل الحجز، حاول مرة أخرى");
            } finally {
              setBookingRouteId(null);
            }
          },
        },
      ]
    );
  }

  const filteredRoutes = availableRoutes.filter((r) => {
    if (!routeUniversityFilter) return true;
    return r.toUniversity.includes(routeUniversityFilter);
  });

  async function handleEstimateFare() {
    setEstimating(true);
    try {
      // static Baghdad coordinates: origin 33.32+random*0.01, dest 33.315/44.366
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
      const result = await estimateFare(origin, dest);
      setFareEstimate(result.estimatedFare);
    } catch (e) {
      Alert.alert("خطأ", "فشل تقدير الأجرة");
    } finally {
      setEstimating(false);
    }
  }

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting("صباح الخير");
    else if (hour >= 12 && hour < 18) setGreeting("مساء الخير");
    else if (hour >= 18 && hour < 22) setGreeting("مساء الخير");
    else setGreeting("ليلة سعيدة");

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (pendingRequest) {
      setTimeLeft(60);
      countdownAnim.setValue(1);
      Animated.timing(countdownAnim, {
        toValue: 0,
        duration: 60000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();

      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      return () => {
        clearInterval(timer);
        countdownAnim.stopAnimation();
        pulseAnim.stopAnimation();
      };
    }
  }, [pendingRequest]);

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
    requestTrip(origin, dest, selectedDriverId || undefined, fareEstimate ?? 75000);
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

  const quickChips = [
    { label: "جامعة بغداد", icon: "book-open" },
    { label: "الجامعة التكنولوجية", icon: "cpu" },
    { label: "كلية الطب", icon: "activity" },
  ];

  const topUniversities = IRAQI_UNIVERSITIES.slice(0, 5).map(u => u.name);

  if (user?.role === "driver") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={["#0D2847", "#1A3C6E"]}
          style={[styles.driverHeader, { paddingTop: topPad + 16 }]}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{greeting}، كابتن</Text>
              <Text style={styles.driverName}>{user.name}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.onlineToggleLarge,
                { backgroundColor: isDriverOnline ? colors.success : "rgba(255,255,255,0.1)" },
              ]}
              onPress={toggleDriverOnline}
              activeOpacity={0.85}
            >
              <Animated.View 
                style={[
                  styles.togglePill, 
                  { 
                    backgroundColor: isDriverOnline ? "#fff" : "rgba(255,255,255,0.3)",
                    transform: [{ translateX: isDriverOnline ? 22 : -22 }]
                  }
                ]} 
              />
              <Text style={[styles.toggleTextLarge, { color: "#fff" }]}>
                {isDriverOnline ? "متصل" : "متوقف"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <TouchableOpacity style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statValue}>{(todayEarnings / 1000).toFixed(0)}k</Text>
                <FeatherIcon name="trending-up" size={12} color={colors.success} />
              </View>
              <Text style={styles.statLabel}>أرباح اليوم</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statValue}>{todayTrips}</Text>
                <FeatherIcon name="arrow-up-right" size={12} color={colors.success} />
              </View>
              <Text style={styles.statLabel}>الرحلات</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statValue}>{(weeklyEarnings / 1000).toFixed(0)}k</Text>
                <FeatherIcon name="trending-up" size={12} color={colors.success} />
              </View>
              <Text style={styles.statLabel}>أرباح الأسبوع</Text>
            </TouchableOpacity>
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
            <Animated.View 
              style={[
                styles.requestCardPremium, 
                { 
                  backgroundColor: colors.primary, 
                  transform: [{ scale: pulseAnim }],
                  borderColor: colors.accent,
                  borderWidth: 2
                }
              ]}
            >
              <View style={styles.requestHeader}>
                <View style={styles.countdownContainer}>
                  <Text style={styles.countdownText}>{timeLeft}s</Text>
                </View>
                <Text style={styles.requestTitle}>طلب رحلة جديد!</Text>
              </View>
              <Text style={styles.requestStudent}>{pendingRequest.studentName}</Text>
              <View style={styles.requestRoute}>
                <FeatherIcon name="map-pin" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.requestAddress} numberOfLines={1}>{pendingRequest.origin?.address ?? pendingRequest.originAddress}</Text>
              </View>
              <View style={styles.requestRoute}>
                <FeatherIcon name="flag" size={14} color="#FF9E7A" />
                <Text style={styles.requestAddress} numberOfLines={1}>{pendingRequest.destination?.address ?? pendingRequest.destAddress}</Text>
              </View>
              <Text style={styles.requestFare}>{(Number(pendingRequest.fare) / 1000).toFixed(0)}k دينار</Text>
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
                  <FeatherIcon name="check" size={16} color="#fff" />
                  <Text style={styles.acceptBtnText}>قبول</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.progressBarBg}>
                <Animated.View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      backgroundColor: colors.accent,
                      width: countdownAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%']
                      })
                    }
                  ]} 
                />
              </View>
            </Animated.View>
          )}

          {!activeTrip && !pendingRequest && (
            <View style={styles.idleContainer}>
              <View style={[styles.tipCard, { backgroundColor: colors.secondary }]}>
                <FeatherIcon name="zap" size={18} color={colors.accent} />
                <Text style={[styles.tipText, { color: colors.primary }]}>أسرع سائق يقبل الطلبات اليوم</Text>
              </View>
              <EmptyState 
                icon={isDriverOnline ? "clock" : "power"}
                title={isDriverOnline ? "بانتظار طلبات الرحلة..." : "أنت غير متاح حالياً"}
                description={isDriverOnline ? "سيصلك إشعار عند وجود طلب رحلة" : "فعّل التوفر لاستقبال طلبات الرحلة"}
                actionLabel={!isDriverOnline ? "تفعيل التوفر" : undefined}
                onAction={!isDriverOnline ? toggleDriverOnline : undefined}
              />
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>المركبة والتقييم</Text>
            <View style={[styles.vehicleCardPremium, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.vehicleInfoMain}>
                <View style={[styles.vehicleIconContainer, { backgroundColor: colors.secondary }]}>
                  <FeatherIcon name="truck" size={24} color={colors.primary} />
                </View>
                <View style={styles.vehicleDetails}>
                  <Text style={[styles.vehicleName, { color: colors.foreground }]}>{user.vehicleType ?? "تويوتا كورولا"}</Text>
                  <Text style={[styles.vehiclePlateText, { color: colors.mutedForeground }]}>{user.vehiclePlate ?? "بغداد 12345"}</Text>
                </View>
                <View style={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <FeatherIcon 
                      key={s} 
                      name="star" 
                      size={14} 
                      color={s <= Math.round(Number(user.rating) || 5) ? "#FFD700" : colors.border} 
                    />
                  ))}
                </View>
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
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.driverName}>{user?.name}</Text>
            <Text style={styles.universityLabel}>{user?.university}</Text>
          </View>
          <View style={[styles.ratingBadge, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <FeatherIcon name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingValue}>{Number(user?.rating ?? 5).toFixed(1)}</Text>
          </View>
        </View>

        {subscription?.isActive ? (
          <View style={[styles.subCardProminent, { backgroundColor: "#fff" }]}>
            <LinearGradient
              colors={[colors.primary, "#2A5CA8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.subCardGradient}
            >
              <View style={styles.subCardInfo}>
                <Text style={styles.subCardTitle}>اشتراكك نشط</Text>
                <Text style={styles.subCardDriver}>مع الكابتن {subscription.driverName}</Text>
                <View style={styles.subProgressContainer}>
                  <View style={styles.subProgressBarBg}>
                    <View 
                      style={[
                        styles.subProgressBarFill, 
                        { width: `${(subscription.tripsUsed / (subscription.tripsPerMonth || 1)) * 100}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.subProgressText}>
                    {subscription.tripsUsed} / {subscription.tripsPerMonth === 999 ? "∞" : subscription.tripsPerMonth} رحلة
                  </Text>
                </View>
              </View>
              <View style={styles.subCardIcon}>
                <FeatherIcon name="shield" size={32} color="rgba(255,255,255,0.3)" />
              </View>
            </LinearGradient>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.subBannerProminent}
            onPress={() => {}} // Navigation handled by tabs usually
          >
            <View style={styles.subBannerContent}>
              <View style={[styles.subBannerIcon, { backgroundColor: colors.accent }]}>
                <FeatherIcon name="star" size={18} color="#fff" />
              </View>
              <View style={styles.subBannerText}>
                <Text style={styles.subBannerTitle}>اشترك مع سائق موثوق</Text>
                <Text style={styles.subBannerSub}>وفر حتى 40% من تكاليف الرحلات</Text>
              </View>
              <FeatherIcon name="chevron-left" size={20} color={colors.accent} />
            </View>
          </TouchableOpacity>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.quickAccessStrip}>
          <TouchableOpacity style={styles.quickItem}>
            <View style={[styles.quickIcon, { backgroundColor: colors.secondary }]}>
              <FeatherIcon name="map" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.foreground }]}>رحلتي</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickItem}>
            <View style={[styles.quickIcon, { backgroundColor: colors.secondary }]}>
              <FeatherIcon name="user" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.foreground }]}>سائقي</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickItem} onPress={() => router.navigate("/(tabs)/subscription")}>
            <View style={[styles.quickIcon, { backgroundColor: colors.secondary }]}>
              <FeatherIcon name="credit-card" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.foreground }]}>اشتراكي</Text>
          </TouchableOpacity>
        </View>

        {activeTrip && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>رحلتك الحالية</Text>
            <TripStatusCard trip={activeTrip} role="student" />
          </View>
        )}

        {!activeTrip && (
          <TouchableOpacity
            style={[styles.bookRideBtnPremium, { shadowColor: colors.primary }]}
            onPress={() => setShowBookModal(true)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[colors.primary, "#2A5CA8"]}
              style={styles.bookRideBtnInner}
            >
              <View>
                <Text style={styles.bookRideBtnTitle}>احجز رحلة الآن</Text>
                <Text style={styles.bookRideBtnSub}>إلى الجامعة أو من الجامعة</Text>
              </View>
              <Animated.View 
                style={[
                  styles.bookRideIconPremium, 
                  { 
                    backgroundColor: colors.accent,
                    transform: [{
                      scale: shimmerAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [1, 1.1, 1]
                      })
                    }]
                  }
                ]}
              >
                <FeatherIcon name="navigation" size={24} color="#fff" />
              </Animated.View>
              <Animated.View 
                style={[
                  styles.shimmerOverlay,
                  {
                    transform: [{
                      translateX: shimmerAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-200, 400]
                      })
                    }]
                  }
                ]}
              />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {subscription?.isActive && subscription.driverId && (
          <TouchableOpacity
            style={[styles.absenceBtn, { backgroundColor: sendingAbsence ? colors.muted : "#FEF3C7", borderColor: "#F59E0B" }]}
            onPress={handleNotifyAbsence}
            disabled={sendingAbsence}
            activeOpacity={0.85}
          >
            <FeatherIcon name="bell-off" size={18} color="#D97706" />
            <View style={{ flex: 1 }}>
              <Text style={styles.absenceBtnTitle}>إبلاغ عن غياب اليوم</Text>
              <Text style={styles.absenceBtnSub}>أبلغ الكابتن {subscription.driverName} بأنك لن تكون موجوداً</Text>
            </View>
            <FeatherIcon name="chevron-left" size={16} color="#D97706" />
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>خطوط الشهرية المتاحة</Text>
            <TouchableOpacity
              style={[styles.onlineCounter, { backgroundColor: colors.secondary }]}
              onPress={onRefreshDrivers}
            >
              <FeatherIcon name="refresh-cw" size={12} color={colors.primary} />
              <Text style={[styles.onlineCountText, { color: colors.primary }]}>
                {availableRoutes.length} خط
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            <TouchableOpacity
              style={[styles.uniFilterChip, { backgroundColor: !routeUniversityFilter ? colors.primary : colors.secondary }]}
              onPress={() => setRouteUniversityFilter("")}
            >
              <Text style={[styles.uniFilterText, { color: !routeUniversityFilter ? "#fff" : colors.primary }]}>الكل</Text>
            </TouchableOpacity>
            {topUniversities.map((uni) => (
              <TouchableOpacity
                key={uni}
                style={[styles.uniFilterChip, { backgroundColor: routeUniversityFilter === uni ? colors.primary : colors.secondary }]}
                onPress={() => setRouteUniversityFilter(routeUniversityFilter === uni ? "" : uni)}
              >
                <Text style={[styles.uniFilterText, { color: routeUniversityFilter === uni ? "#fff" : colors.primary }]} numberOfLines={1}>{uni}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filteredRoutes.length > 0 ? (
            filteredRoutes.slice(0, 5).map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                onBook={handleBookRoute}
                isBooked={subscription?.isActive && subscription.driverId === route.driverId}
              />
            ))
          ) : (
            <EmptyState
              icon="map"
              title="لا توجد خطوط متاحة"
              description={routeUniversityFilter ? `لا توجد خطوط لـ${routeUniversityFilter} حالياً` : "لم يُضف أي سائق خطاً بعد"}
            />
          )}
          {filteredRoutes.length > 5 && (
            <TouchableOpacity
              style={[styles.showMoreBtn, { backgroundColor: colors.secondary }]}
              onPress={() => setShowRoutesModal(true)}
            >
              <Text style={[styles.showMoreText, { color: colors.primary }]}>عرض جميع الخطوط ({filteredRoutes.length})</Text>
              <FeatherIcon name="chevron-left" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>السائقون المتاحون</Text>
            <View style={[styles.onlineCounter, { backgroundColor: colors.secondary }]}>
              <View style={[styles.pulseDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.onlineCountText, { color: colors.primary }]}>
                {availableDrivers.filter((d) => d.isOnline).length} متاح
              </Text>
            </View>
          </View>
          {availableDrivers.filter(d => d.isOnline).length > 0 ? (
            availableDrivers.filter(d => d.isOnline).map((driver) => (
              <TouchableOpacity 
                key={driver.id} 
                onPress={() => setSelectedDriverId(driver.id)}
                activeOpacity={0.9}
                style={[{ marginBottom: 12 }, selectedDriverId === driver.id ? { borderWidth: 2, borderColor: colors.accent, borderRadius: 16, overflow: 'hidden' } : {}]}
              >
                <DriverCard driver={driver} onSubscribe={handleSubscribe} />
                {selectedDriverId === driver.id && (
                  <View style={{ padding: 8, alignItems: 'center', backgroundColor: colors.accent }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>تم الاختيار للرحلة</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <EmptyState 
              icon="users"
              title="لا يوجد كباتن متاحون"
              description="جميع الكباتن مشغولون حالياً"
            />
          )}
        </View>
      </ScrollView>

      <Modal visible={showRoutesModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalDragHandle} />
          <View style={[styles.modalHeader, { borderBottomWidth: 0 }]}>
            <TouchableOpacity onPress={() => setShowRoutesModal(false)}>
              <FeatherIcon name="x" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitleLarge, { color: colors.foreground }]}>جميع الخطوط</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {filteredRoutes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                onBook={(r) => { setShowRoutesModal(false); handleBookRoute(r); }}
                isBooked={subscription?.isActive && subscription.driverId === route.driverId}
              />
            ))}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showBookModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalDragHandle} />
          <View style={[styles.modalHeader, { borderBottomWidth: 0 }]}>
            <TouchableOpacity onPress={() => setShowBookModal(false)}>
              <FeatherIcon name="x" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitleLarge, { color: colors.foreground }]}>أين تريد الذهاب؟</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.modalContent}>
            <View style={[styles.inputGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.field}>
                <View style={styles.iconContainer}>
                  <FeatherIcon name="map-pin" size={18} color={colors.success} />
                </View>
                <TextInput
                  style={[styles.locationInputClean, { color: colors.foreground }]}
                  value={originText}
                  onChangeText={setOriginText}
                  placeholder="موقع الانطلاق (موقعي الحالي)"
                  placeholderTextColor={colors.mutedForeground}
                  textAlign="right"
                />
              </View>
              <View style={[styles.inputSeparator, { backgroundColor: colors.border }]} />
              <View style={styles.field}>
                <View style={styles.iconContainer}>
                  <FeatherIcon name="flag" size={18} color={colors.accent} />
                </View>
                <TextInput
                  style={[styles.locationInputClean, { color: colors.foreground }]}
                  value={destText}
                  onChangeText={setDestText}
                  placeholder="الوجهة (مثلاً: جامعة بغداد)"
                  placeholderTextColor={colors.mutedForeground}
                  textAlign="right"
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.estimateBtn, { backgroundColor: colors.secondary, marginTop: 16, padding: 12, borderRadius: 12, alignItems: 'center' }]}
              onPress={handleEstimateFare}
              disabled={estimating}
            >
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                {estimating ? "جاري التقدير..." : "تقدير الأجرة"}
              </Text>
            </TouchableOpacity>

            {fareEstimate !== null && (
              <View style={[styles.fareCard, { backgroundColor: colors.card, borderColor: colors.accent, borderWidth: 1, padding: 16, borderRadius: 12, marginTop: 16, alignItems: 'center' }]}>
                <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: 'bold' }}>الأجرة المتوقعة: {(fareEstimate / 1000).toFixed(0)}k دينار</Text>
              </View>
            )}

            <View style={styles.suggestionRow}>
              {quickChips.map((chip, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.chip, { backgroundColor: colors.secondary }]}
                  onPress={() => setDestText(chip.label)}
                >
                  <FeatherIcon name={chip.icon as any} size={14} color={colors.primary} />
                  <Text style={[styles.chipText, { color: colors.primary }]}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flex: 1 }} />

            <TouchableOpacity
              style={[
                styles.confirmBookingBtn,
                { backgroundColor: colors.primary, opacity: (!originText && !destText) ? 0.7 : 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 8 }
              ]}
              onPress={handleBookRide}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>تأكيد الحجز</Text>
              <FeatherIcon name="arrow-left" size={20} color="#fff" />
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
  onlineToggleLarge: { 
    flexDirection: "row", 
    alignItems: "center", 
    width: 80,
    height: 36,
    borderRadius: 18, 
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  togglePill: { width: 28, height: 28, borderRadius: 14, position: 'absolute' },
  toggleTextLarge: { fontSize: 12, fontFamily: "Inter_700Bold" },
  statsGrid: { flexDirection: "row", gap: 12 },
  statCard: { 
    flex: 1, 
    backgroundColor: "rgba(255,255,255,0.1)", 
    borderRadius: 16, 
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)"
  },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  statValue: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  ratingBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 4 },
  ratingValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  subCardProminent: { borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  subCardGradient: { padding: 16, flexDirection: 'row', justifyContent: 'space-between' },
  subCardInfo: { flex: 1 },
  subCardTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  subCardDriver: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff', marginBottom: 12 },
  subProgressContainer: { gap: 6 },
  subProgressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  subProgressBarFill: { height: '100%', backgroundColor: '#fff' },
  subProgressText: { fontSize: 10, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.8)' },
  subCardIcon: { justifyContent: 'center', alignItems: 'center' },
  subBannerProminent: { backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  subBannerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subBannerIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  subBannerText: { flex: 1 },
  subBannerTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#1A3C6E' },
  subBannerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#8A9BB0', marginTop: 2 },
  content: { flex: 1 },
  quickAccessStrip: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 4 },
  quickItem: { alignItems: 'center', gap: 8 },
  quickIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  onlineCounter: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  onlineCountText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  absenceBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  absenceBtnTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#92400E' },
  absenceBtnSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#B45309', marginTop: 2 },
  uniFilterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  uniFilterText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  showMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 14, marginTop: 4 },
  showMoreText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  pulseDot: { width: 8, height: 8, borderRadius: 4 },
  bookRideBtnPremium: { borderRadius: 16, marginBottom: 24, overflow: "hidden", elevation: 8, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12 },
  bookRideBtnInner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 24, position: 'relative' },
  bookRideBtnTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 4 },
  bookRideBtnSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  bookRideIconPremium: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 4 },
  shimmerOverlay: { position: 'absolute', top: 0, bottom: 0, width: 100, backgroundColor: 'rgba(255,255,255,0.1)', transform: [{ skewX: '-20deg' }] },
  requestCardPremium: { marginBottom: 24, padding: 20, borderRadius: 20, position: 'relative', overflow: 'hidden' },
  requestHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  countdownContainer: { backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countdownText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  requestTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
  requestStudent: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 12 },
  requestRoute: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  requestAddress: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", flex: 1 },
  requestFare: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FF9E7A", marginVertical: 12 },
  requestActions: { flexDirection: "row", gap: 12, marginTop: 4 },
  rejectBtn: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  rejectBtnText: { color: "rgba(255,255,255,0.8)", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  acceptBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 14, paddingVertical: 14, gap: 8 },
  acceptBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  progressBarBg: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: 'rgba(0,0,0,0.1)' },
  progressBarFill: { height: '100%' },
  idleContainer: { marginBottom: 24 },
  tipCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, marginBottom: 16 },
  tipText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  vehicleCardPremium: { borderRadius: 18, borderWidth: 1, padding: 16 },
  vehicleInfoMain: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  vehicleIconContainer: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  vehicleDetails: { flex: 1 },
  vehicleName: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  vehiclePlateText: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  ratingStars: { flexDirection: 'row', gap: 2 },
  modalContainer: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalDragHandle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginTop: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20 },
  modalTitleLarge: { fontSize: 22, fontFamily: "Inter_700Bold" },
  modalContent: { padding: 20, gap: 20 },
  inputGroup: { borderRadius: 18, borderWidth: 1, padding: 4 },
  field: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12 },
  iconContainer: { width: 32, alignItems: 'center' },
  locationInputClean: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular" },
  inputSeparator: { height: 1, marginHorizontal: 12 },
  suggestionRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  chipText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  fareCard: { borderRadius: 18, borderWidth: 1, padding: 16 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fareInfo: { gap: 4 },
  fareLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  fareValue: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  fareIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmBookBtnPremium: { borderRadius: 16, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 10, elevation: 4 },
  confirmBookBtnTextLarge: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
  estimateBtn: {},
  confirmBookingBtn: {},
});
