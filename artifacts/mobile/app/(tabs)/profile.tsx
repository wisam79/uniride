import FeatherIcon from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState, useEffect } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Share,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { BAGHDAD_AREAS, IRAQI_UNIVERSITIES, formatIQD } from "@/lib/universities";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser, tripHistory, refreshUser, myDriverRoutes, createRoute, updateRoute, deleteRoute } = useApp();
  const [editModal, setEditModal] = useState(false);
  const [routeModal, setRouteModal] = useState(false);
  const [savingRoute, setSavingRoute] = useState(false);
  const [newRouteFromArea, setNewRouteFromArea] = useState("");
  const [newRouteToUniversity, setNewRouteToUniversity] = useState("");
  const [newRouteMorning, setNewRouteMorning] = useState("07:30");
  const [newRouteEvening, setNewRouteEvening] = useState("14:00");
  const [newRouteFare, setNewRouteFare] = useState("80000");
  const [newRouteSeats, setNewRouteSeats] = useState("4");
  const [newRouteGender, setNewRouteGender] = useState<"any" | "female" | "male">("any");
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [showUniDropdown, setShowUniDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState(user?.name ?? "");
  const [editPhone, setEditPhone] = useState(user?.phone ?? "");
  const [editUniversity, setEditUniversity] = useState(user?.university ?? "");
  const [editVehicle, setEditVehicle] = useState(user?.vehicleType ?? "");
  const [editPlate, setEditPlate] = useState(user?.vehiclePlate ?? "");
  const [editVehicleColor, setEditVehicleColor] = useState(user?.vehicleColor ?? "");
  const [editFareBasic, setEditFareBasic] = useState(user?.basicFare?.toString() ?? "5000");
  const [editFareStandard, setEditFareStandard] = useState(user?.standardFare?.toString() ?? "10000");
  const [editFarePremium, setEditFarePremium] = useState(user?.premiumFare?.toString() ?? "15000");
  const [notifications, setNotifications] = useState(true);
  const [locationShare, setLocationShare] = useState(true);
  const [themeLabel, setThemeLabel] = useState("فاتح");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem("notificationsEnabled");
        if (stored !== null) setNotifications(stored === "true");
      } catch { /* ignore */ }
    };
    loadSettings();
  }, []);

  async function handleToggleNotifications(val: boolean) {
    setNotifications(val);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await AsyncStorage.setItem("notificationsEnabled", String(val));
    } catch { /* ignore */ }
  }

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const role = user?.role ?? "student";

  const completedTrips = tripHistory.filter((t) => t.status === "completed").length;

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateUser({
        name: editName.trim() || user?.name,
        phone: editPhone.trim() || user?.phone,
        university: role === "student" ? editUniversity.trim() || user?.university : user?.university,
        vehicleType: role === "driver" ? editVehicle.trim() || user?.vehicleType : user?.vehicleType,
        vehiclePlate: role === "driver" ? editPlate.trim() || user?.vehiclePlate : user?.vehiclePlate,
        vehicleColor: role === "driver" ? editVehicleColor.trim() || user?.vehicleColor : undefined,
        basicFare: role === "driver" ? parseInt(editFareBasic) || user?.basicFare : undefined,
        standardFare: role === "driver" ? parseInt(editFareStandard) || user?.standardFare : undefined,
        premiumFare: role === "driver" ? parseInt(editFarePremium) || user?.premiumFare : undefined,
      } as any);
      await refreshUser();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditModal(false);
    } catch (error) {
      Alert.alert("خطأ", "حدث خطأ أثناء حفظ البيانات");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    Alert.alert(
      "تسجيل الخروج",
      "هل أنت متأكد من رغبتك بتسجيل الخروج؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "خروج",
          style: "destructive",
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await logout();
            router.replace("/onboarding");
          },
        },
      ]
    );
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'انضم إلي في يونيرايد! تطبيق التوصيل الأول للطلاب في العراق.',
      });
    } catch (error) {
      // console.error(error);
    }
  };

  const handleSupport = () => {
    Alert.alert("الدعم الفني", "يمكنك التواصل معنا عبر الرقم التالي:\n07901234567");
  };

  async function handleSaveRoute() {
    if (!newRouteFromArea.trim() || !newRouteToUniversity.trim()) {
      Alert.alert("خطأ", "الرجاء إدخال منطقة الانطلاق والجامعة");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(newRouteMorning) || !/^\d{2}:\d{2}$/.test(newRouteEvening)) {
      Alert.alert("خطأ", "أدخل الأوقات بصيغة HH:MM مثلاً 07:30");
      return;
    }
    setSavingRoute(true);
    try {
      await createRoute({
        fromArea: newRouteFromArea.trim(),
        fromCity: "بغداد",
        toUniversity: newRouteToUniversity.trim(),
        departureMorning: newRouteMorning,
        departureEvening: newRouteEvening,
        totalSeats: parseInt(newRouteSeats) || 4,
        availableSeats: parseInt(newRouteSeats) || 4,
        monthlyFare: String(parseInt(newRouteFare) || 80000),
        genderPreference: newRouteGender,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRouteModal(false);
      setNewRouteFromArea("");
      setNewRouteToUniversity("");
      setNewRouteMorning("07:30");
      setNewRouteEvening("14:00");
      setNewRouteFare("80000");
      setNewRouteSeats("4");
      setNewRouteGender("any");
      Alert.alert("تم ✓", "تم إضافة الخط بنجاح. سيظهر للطلاب الآن.");
    } catch (err: any) {
      Alert.alert("خطأ", err?.response?.data?.error ?? "فشل إضافة الخط");
    } finally {
      setSavingRoute(false);
    }
  }

  async function handleDeleteRoute(routeId: string) {
    Alert.alert(
      "حذف الخط",
      "هل أنت متأكد من حذف هذا الخط؟",
      [
        { text: "إلغاء", style: "cancel" },
        { text: "حذف", style: "destructive", onPress: async () => {
          try {
            await deleteRoute(routeId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch { Alert.alert("خطأ", "فشل حذف الخط"); }
        }},
      ]
    );
  }

  const handleRate = () => {
    Alert.alert("تقييم التطبيق", "شكراً لك! تقييمك يهمنا");
  };

  function MenuItem({
    icon,
    label,
    value,
    onPress,
    isLast,
    danger,
    toggle,
    toggleValue,
    onToggle,
  }: {
    icon: string;
    label: string;
    value?: string;
    onPress?: () => void;
    isLast?: boolean;
    danger?: boolean;
    toggle?: boolean;
    toggleValue?: boolean;
    onToggle?: (v: boolean) => void;
  }) {
    return (
      <TouchableOpacity
        style={[styles.menuItem, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
        onPress={onPress}
        activeOpacity={toggle ? 1 : 0.7}
        disabled={!onPress && !toggle}
      >
        <View style={[styles.menuIcon, { backgroundColor: danger ? colors.destructive + "15" : colors.secondary }]}>
          <FeatherIcon name={icon as any} size={16} color={danger ? colors.destructive : colors.primary} />
        </View>
        <Text style={[styles.menuLabel, { color: danger ? colors.destructive : colors.foreground }]}>{label}</Text>
        {toggle ? (
          <Switch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{ false: colors.muted, true: colors.primary }}
            thumbColor="#fff"
          />
        ) : (
          <View style={styles.menuRight}>
            {value && <Text style={[styles.menuValue, { color: colors.mutedForeground }]}>{value}</Text>}
            {onPress && <FeatherIcon name="chevron-left" size={16} color={colors.mutedForeground} />}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#0D2847", "#1A3C6E"]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.avatarArea}>
          <View style={[styles.avatar, { borderColor: role === "student" ? colors.accent : colors.primary, borderWidth: 4 }]}>
            <View style={[styles.avatarInner, { backgroundColor: role === "student" ? "#FF6B35" : "#5B8DEF" }]}>
              <Text style={styles.avatarText}>{user?.name.substring(0, 2)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.editAvatarBtn, { backgroundColor: "rgba(255,255,255,0.2)" }]}
            onPress={() => setEditModal(true)}
          >
            <FeatherIcon name="edit-2" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        
        <LinearGradient
          colors={role === 'student' ? ['#FF6B35', '#FF8C5A'] : ['#1A3C6E', '#2A5CA8']}
          style={styles.roleChip}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <FeatherIcon name={role === "student" ? "book-open" : "truck"} size={12} color="#fff" />
          <Text style={styles.roleChipText}>{role === "student" ? "طالب جامعي" : "سائق"}</Text>
        </LinearGradient>

        <View style={styles.badgesRow}>
          {role === 'student' ? (
            <>
              {completedTrips > 5 && (
                <View style={[styles.badgeChip, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                  <Text style={styles.badgeText}>طالب نشط ⭐</Text>
                </View>
              )}
              <View style={[styles.badgeChip, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                <Text style={styles.badgeText}>موثوق ✓</Text>
              </View>
            </>
          ) : (
            <>
              {completedTrips > 10 && (
                <View style={[styles.badgeChip, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                  <Text style={styles.badgeText}>سائق مميز 🏆</Text>
                </View>
              )}
              {Number(user?.rating ?? 0) > 4.5 && (
                <View style={[styles.badgeChip, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                  <Text style={styles.badgeText}>تقييم عالي ⭐</Text>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => router.navigate("/(tabs)/trips")}
          >
            <Text style={styles.statValue}>{completedTrips}</Text>
            <Text style={styles.statLabel}>رحلة</Text>
          </TouchableOpacity>
          <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => role === 'driver' ? router.navigate("/(tabs)/subscription") : undefined}
          >
            <Text style={styles.statValue}>{Number(user?.rating ?? 5).toFixed(1)}</Text>
            <Text style={styles.statLabel}>التقييم</Text>
          </TouchableOpacity>
          <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{role === "student" ? (user?.university?.split(" ")[1] ?? "—") : (user?.vehicleType?.split(" ")[0] ?? "—")}</Text>
            <Text style={styles.statLabel}>{role === "student" ? "الجامعة" : "السيارة"}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>مايو</Text>
            <Text style={styles.statLabel}>عضو منذ</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {role === "driver" && (
          <View style={styles.section}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <TouchableOpacity
                style={[styles.addRouteBtn, { backgroundColor: colors.accent }]}
                onPress={() => setRouteModal(true)}
              >
                <FeatherIcon name="plus" size={14} color="#fff" />
                <Text style={styles.addRouteBtnText}>إضافة خط جديد</Text>
              </TouchableOpacity>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>خطوطي</Text>
            </View>
            <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {myDriverRoutes.length === 0 ? (
                <View style={{ padding: 20, alignItems: "center" }}>
                  <FeatherIcon name="map" size={28} color={colors.mutedForeground} />
                  <Text style={[{ color: colors.mutedForeground, marginTop: 10, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" }]}>لم تُضف أي خط بعد{"\n"}أضف خطك الأول لتظهر للطلاب</Text>
                </View>
              ) : (
                myDriverRoutes.map((route, idx) => (
                  <View
                    key={route.id}
                    style={[styles.routeItem, !idx && { borderTopWidth: 0 }, { borderTopColor: colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.routeItemTitle, { color: colors.foreground }]}>
                        {route.fromArea} ← {route.toUniversity}
                      </Text>
                      <Text style={[styles.routeItemSub, { color: colors.mutedForeground }]}>
                        ↑ {route.departureMorning} | ↓ {route.departureEvening} | {route.availableSeats}/{route.totalSeats} مقعد | {formatIQD(Number(route.monthlyFare))}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                        <View style={[styles.routeStatusBadge, { backgroundColor: route.isActive ? "#D1FAE5" : "#FEE2E2" }]}>
                          <Text style={[{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: route.isActive ? "#065F46" : "#991B1B" }]}>
                            {route.isActive ? "نشط" : "موقوف"}
                          </Text>
                        </View>
                        {route.genderPreference !== "any" && (
                          <View style={[styles.routeStatusBadge, { backgroundColor: "#FCE7F3" }]}>
                            <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#9D174D" }}>
                              {route.genderPreference === "female" ? "طالبات" : "طلاب"}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={{ gap: 6 }}>
                      <TouchableOpacity
                        style={[styles.routeActionBtn, { backgroundColor: route.isActive ? "#FEE2E2" : "#D1FAE5" }]}
                        onPress={() => updateRoute(route.id, { isActive: !route.isActive })}
                      >
                        <FeatherIcon name={route.isActive ? "pause" : "play"} size={13} color={route.isActive ? colors.destructive : "#065F46"} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.routeActionBtn, { backgroundColor: "#FEE2E2" }]}
                        onPress={() => handleDeleteRoute(route.id)}
                      >
                        <FeatherIcon name="trash-2" size={13} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>المعلومات الشخصية</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem icon="user" label={user?.name ?? ""} value={user?.phone} onPress={() => setEditModal(true)} />
            <MenuItem icon="phone" label={user?.phone ?? ""} />
            {role === "student" && (
              <MenuItem icon="book-open" label={user?.university ?? "—"} isLast />
            )}
            {role === "driver" && (
              <>
                <MenuItem icon="truck" label={user?.vehicleType ?? "—"} />
                <MenuItem icon="hash" label={user?.vehiclePlate ?? "—"} />
                {user?.vehicleColor && <MenuItem icon="palette" label={user.vehicleColor} />}
                <MenuItem icon="dollar-sign" label={`الأساسي: ${user?.basicFare ?? 5000} د.ع`} />
                <MenuItem icon="dollar-sign" label={`القياسي: ${user?.standardFare ?? 10000} د.ع`} />
                <MenuItem icon="dollar-sign" label={`المميز: ${user?.premiumFare ?? 15000} د.ع`} isLast />
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>الإعدادات</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem
              icon="globe"
              label="اللغة"
              value="العربية"
            />
            <MenuItem
              icon="bell"
              label="الإشعارات"
              toggle
              toggleValue={notifications}
              onToggle={handleToggleNotifications}
            />
            <MenuItem
              icon="moon"
              label="المظهر"
              value={themeLabel}
              onPress={() => Alert.alert("قريباً", "قريباً: الوضع الداكن")}
            />
            <MenuItem
              icon="map-pin"
              label="مشاركة الموقع"
              toggle
              toggleValue={locationShare}
              onToggle={(v) => { setLocationShare(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              isLast
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>الدعم والمشاركة</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem icon="headphones" label="الدعم الفني" onPress={handleSupport} />
            <MenuItem icon="share-2" label="شارك التطبيق" onPress={handleShare} />
            <MenuItem icon="star" label="قيّم التطبيق" onPress={handleRate} isLast />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>عن التطبيق</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem icon="info" label="يونيرايد" value="v1.0.0" />
            <MenuItem icon="shield" label="سياسة الخصوصية" onPress={() => {}} />
            <MenuItem icon="file-text" label="شروط الاستخدام" onPress={() => {}} isLast />
          </View>
        </View>

        <View style={styles.section}>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem icon="log-out" label="تسجيل الخروج" onPress={handleLogout} danger isLast />
          </View>
        </View>

        <View style={styles.footerContainer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            يونيرايد العراق · النسخة 1.0.0
          </Text>
          <Text style={[styles.footerSubtext, { color: colors.mutedForeground }]}>
            تواصل معنا: uniride@example.com
          </Text>
        </View>
      </ScrollView>

      <Modal visible={routeModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderColor: colors.border }]}>
            <TouchableOpacity onPress={() => setRouteModal(false)}>
              <FeatherIcon name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>إضافة خط جديد</Text>
            <TouchableOpacity onPress={handleSaveRoute} disabled={savingRoute}>
              {savingRoute ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.saveBtn, { color: colors.primary }]}>حفظ</Text>
              )}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>منطقة الانطلاق (بغداد)</Text>
              <TouchableOpacity
                style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}
                onPress={() => { setShowAreaDropdown(!showAreaDropdown); setShowUniDropdown(false); }}
              >
                <FeatherIcon name={showAreaDropdown ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
                <Text style={[{ fontFamily: "Inter_400Regular", fontSize: 15 }, { color: newRouteFromArea ? colors.foreground : colors.mutedForeground }]}>
                  {newRouteFromArea || "اختر المنطقة"}
                </Text>
              </TouchableOpacity>
              {showAreaDropdown && (
                <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                    {BAGHDAD_AREAS.map((area) => (
                      <TouchableOpacity key={area} style={styles.dropdownItem} onPress={() => { setNewRouteFromArea(area); setShowAreaDropdown(false); }}>
                        <Text style={[styles.dropdownText, { color: colors.foreground }]}>{area}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>الجامعة المقصودة</Text>
              <TouchableOpacity
                style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}
                onPress={() => { setShowUniDropdown(!showUniDropdown); setShowAreaDropdown(false); }}
              >
                <FeatherIcon name={showUniDropdown ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
                <Text style={[{ fontFamily: "Inter_400Regular", fontSize: 15 }, { color: newRouteToUniversity ? colors.foreground : colors.mutedForeground }]}>
                  {newRouteToUniversity || "اختر الجامعة"}
                </Text>
              </TouchableOpacity>
              {showUniDropdown && (
                <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                    {IRAQI_UNIVERSITIES.map((u) => (
                      <TouchableOpacity key={u.name} style={styles.dropdownItem} onPress={() => { setNewRouteToUniversity(u.name); setShowUniDropdown(false); }}>
                        <Text style={[styles.dropdownText, { color: colors.foreground }]}>{u.name} — {u.city}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>وقت الذهاب</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  value={newRouteMorning} onChangeText={setNewRouteMorning}
                  placeholder="07:30" placeholderTextColor={colors.mutedForeground}
                  textAlign="center" keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>وقت العودة</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  value={newRouteEvening} onChangeText={setNewRouteEvening}
                  placeholder="14:00" placeholderTextColor={colors.mutedForeground}
                  textAlign="center" keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>الأجرة الشهرية (د.ع)</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  value={newRouteFare} onChangeText={setNewRouteFare}
                  placeholder="80000" placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad" textAlign="right"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>عدد المقاعد</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  value={newRouteSeats} onChangeText={setNewRouteSeats}
                  placeholder="4" placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad" textAlign="center"
                />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>تفضيل الجنس</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[
                  { value: "any", label: "الجميع" },
                  { value: "female", label: "طالبات فقط" },
                  { value: "male", label: "طلاب فقط" },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.genderOption, { backgroundColor: newRouteGender === opt.value ? colors.primary : colors.secondary, flex: 1 }]}
                    onPress={() => setNewRouteGender(opt.value as any)}
                  >
                    <Text style={[styles.genderOptionText, { color: newRouteGender === opt.value ? "#fff" : colors.foreground }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={editModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderColor: colors.border }]}>
            <TouchableOpacity onPress={() => setEditModal(false)}>
              <FeatherIcon name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>تعديل الملف</Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.saveBtn, { color: colors.primary }]}>حفظ</Text>
              )}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>الاسم الكامل</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={editName}
                onChangeText={setEditName}
                textAlign="right"
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>رقم الهاتف</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                textAlign="right"
              />
            </View>
            {role === "student" && (
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>الجامعة</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  value={editUniversity}
                  onChangeText={setEditUniversity}
                  textAlign="right"
                />
              </View>
            )}
            {role === "driver" && (
              <>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>نوع السيارة</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    value={editVehicle}
                    onChangeText={setEditVehicle}
                    textAlign="right"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>رقم اللوحة</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    value={editPlate}
                    onChangeText={setEditPlate}
                    textAlign="right"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>لون السيارة</Text>
                  <View style={styles.colorSelector}>
                    {['أبيض', 'أسود', 'فضي', 'أحمر', 'أزرق'].map((colorName) => {
                      const colorMap: Record<string, string> = {
                        'أبيض': '#FFFFFF',
                        'أسود': '#000000',
                        'فضي': '#C0C0C0',
                        'أحمر': '#FF0000',
                        'أزرق': '#0000FF'
                      };
                      return (
                        <TouchableOpacity
                          key={colorName}
                          onPress={() => setEditVehicleColor(colorName)}
                          style={[
                            styles.colorCircle,
                            { backgroundColor: colorMap[colorName] },
                            editVehicleColor === colorName && { borderWidth: 3, borderColor: colors.primary }
                          ]}
                        />
                      );
                    })}
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>السعر الأساسي (دينار)</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    value={editFareBasic}
                    onChangeText={setEditFareBasic}
                    keyboardType="numeric"
                    textAlign="right"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>السعر القياسي (دينار)</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    value={editFareStandard}
                    onChangeText={setEditFareStandard}
                    keyboardType="numeric"
                    textAlign="right"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>السعر المميز (دينار)</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    value={editFarePremium}
                    onChangeText={setEditFarePremium}
                    keyboardType="numeric"
                    textAlign="right"
                  />
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 24, alignItems: "center" },
  avatarArea: { position: "relative", marginBottom: 12 },
  avatar: { width: 96, height: 96, borderRadius: 48, padding: 4 },
  avatarInner: { width: "100%", height: "100%", borderRadius: 44, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 36, fontFamily: "Inter_700Bold", color: "#fff" },
  editAvatarBtn: { position: "absolute", bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: '#1A3C6E' },
  userName: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 8 },
  roleChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 12 },
  roleChipText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  badgesRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  badgeChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 11, fontFamily: 'Inter_500Medium' },
  statsRow: { flexDirection: "row", width: "100%" },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 2 },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  statDivider: { width: 1, height: '60%', alignSelf: 'center' },
  content: { flex: 1 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, marginLeft: 4, textAlign: 'right', paddingRight: 4 },
  menuCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  menuItem: { flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", textAlign: 'right' },
  menuRight: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  menuValue: { fontSize: 13, fontFamily: "Inter_400Regular" },
  footerContainer: { alignItems: 'center', marginTop: 10, marginBottom: 20 },
  footerText: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 4 },
  footerSubtext: { fontSize: 11, fontFamily: "Inter_400Regular", opacity: 0.8 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  saveBtn: { fontSize: 15, fontFamily: "Inter_700Bold" },
  modalContent: { padding: 20 },
  field: { marginBottom: 20 },
  fieldLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right", marginBottom: 8 },
  fieldInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: "Inter_400Regular" },
  colorSelector: { flexDirection: 'row-reverse', gap: 12, marginTop: 4 },
  colorCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#ccc' },
  addRouteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addRouteBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_700Bold' },
  routeItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderTopWidth: 1 },
  routeItemTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  routeItemSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  routeStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  routeActionBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dropdownList: { borderWidth: 1, borderRadius: 12, marginTop: 4, overflow: 'hidden' },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  dropdownText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'right' },
  genderOption: { padding: 10, borderRadius: 12, alignItems: 'center' },
  genderOptionText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
});
