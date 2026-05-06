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

import { useAuth, useTrip, useDriver, useSubscription } from "@/context";
import { useColors } from "@/hooks/useColors";
import { formatIQD } from "@/lib/utils";

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
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={toggle ? 1 : 0.7}
      disabled={!onPress && !toggle}
    >
      <View
        style={[
          styles.menuIcon,
          { backgroundColor: danger ? colors.destructive + "15" : colors.secondary },
        ]}
      >
        <FeatherIcon
          name={icon as any}
          size={16}
          color={danger ? colors.destructive : colors.primary}
        />
      </View>
      <Text
        style={[
          styles.menuLabel,
          { color: danger ? colors.destructive : colors.foreground },
        ]}
      >
        {label}
      </Text>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: colors.muted, true: colors.primary }}
          thumbColor="#fff"
        />
      ) : (
        <View style={styles.menuRight}>
          {value && (
            <Text style={[styles.menuValue, { color: colors.mutedForeground }]}>{value}</Text>
          )}
          {onPress && (
            <FeatherIcon name="chevron-left" size={16} color={colors.mutedForeground} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut: logout, updateProfile: updateUser } = useAuth();
  const { tripHistory } = useTrip();
  const { driver } = useDriver();
  const { subscription, fetchSubscription } = useSubscription();

  const [editModal, setEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState(user?.full_name ?? "");
  const [editPhone, setEditPhone] = useState(user?.phone ?? "");
  const [notifications, setNotifications] = useState(true);
  const [locationShare, setLocationShare] = useState(true);

  useEffect(() => {
    fetchSubscription();
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem("notificationsEnabled");
        if (stored !== null) setNotifications(stored === "true");
      } catch {
        /* ignore */
      }
    };
    loadSettings();
  }, []);

  async function handleToggleNotifications(val: boolean) {
    setNotifications(val);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await AsyncStorage.setItem("notificationsEnabled", String(val));
    } catch {
      /* ignore */
    }
  }

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const role = user?.role ?? "student";

  const completedTrips = tripHistory.filter((t) => t.status === "completed").length;

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateUser({
        full_name: editName.trim() || user?.full_name,
        phone: editPhone.trim() || user?.phone,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditModal(false);
    } catch {
      Alert.alert("خطأ", "حدث خطأ أثناء حفظ البيانات");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    Alert.alert("تسجيل الخروج", "هل أنت متأكد من رغبتك بتسجيل الخروج؟", [
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
    ]);
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: "انضم إلي في يونيرايد! تطبيق التوصيل الأول للطلاب في العراق.",
      });
    } catch {
      /* ignore */
    }
  };

  const handleSupport = () => {
    Alert.alert("الدعم الفني", "يمكنك التواصل معنا عبر البريد الإلكتروني:\nuniride@example.com");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#0D2847", "#1A3C6E"]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.avatarArea}>
          <View
            style={[
              styles.avatar,
              {
                borderColor: role === "student" ? colors.accent : colors.primary,
                borderWidth: 4,
              },
            ]}
          >
            <View
              style={[
                styles.avatarInner,
                { backgroundColor: role === "student" ? "#FF6B35" : "#5B8DEF" },
              ]}
            >
              <Text style={styles.avatarText}>
                {(user?.full_name ?? "??").substring(0, 2)}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.editAvatarBtn, { backgroundColor: "rgba(255,255,255,0.2)" }]}
            onPress={() => {
              setEditName(user?.full_name ?? "");
              setEditPhone(user?.phone ?? "");
              setEditModal(true);
            }}
          >
            <FeatherIcon name="edit-2" size={14} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.userName}>{user?.full_name}</Text>

        <LinearGradient
          colors={
            role === "student"
              ? ["#FF6B35", "#FF8C5A"]
              : ["#1A3C6E", "#2A5CA8"]
          }
          style={styles.roleChip}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <FeatherIcon
            name={role === "student" ? "book-open" : "truck"}
            size={12}
            color="#fff"
          />
          <Text style={styles.roleChipText}>
            {role === "student" ? "طالب جامعي" : "سائق"}
          </Text>
        </LinearGradient>

        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => router.navigate("/(tabs)/trips")}
          >
            <Text style={styles.statValue}>{completedTrips}</Text>
            <Text style={styles.statLabel}>رحلة</Text>
          </TouchableOpacity>
          <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {role === "student"
                ? user?.phone?.slice(-3) ?? "—"
                : driver?.vehicle_info?.split(" ")[0] ?? "—"}
            </Text>
            <Text style={styles.statLabel}>
              {role === "student" ? "رقم الهاتف" : "السيارة"}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {role === "student"
                ? subscription?.status === "active"
                  ? "نشط"
                  : "لا يوجد"
                : driver?.capacity ?? "—"}
            </Text>
            <Text style={styles.statLabel}>
              {role === "student" ? "الاشتراك" : "المقاعد"}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {role === "student" && subscription?.status === "active" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>الاشتراك الحالي</Text>
            <View style={[styles.subCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.subCardRow}>
                <FeatherIcon name="credit-card" size={20} color={colors.success} />
                <View style={styles.subCardInfo}>
                  <Text style={[styles.subCardLabel, { color: colors.foreground }]}>الاشتراك الشهري</Text>
                  <Text style={[styles.subCardValue, { color: colors.success }]}>
                    {subscription.monthly_fee ? formatIQD(subscription.monthly_fee) : "—"}
                  </Text>
                </View>
              </View>
              <View style={[styles.subCardDivider, { backgroundColor: colors.border }]} />
              <View style={styles.subCardRow}>
                <FeatherIcon name="truck" size={20} color={colors.primary} />
                <View style={styles.subCardInfo}>
                  <Text style={[styles.subCardLabel, { color: colors.foreground }]}>سائقك</Text>
                  <Text style={[styles.subCardValue, { color: colors.primary }]}>
                    {subscription.driver?.vehicle_info ?? "السائق"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>المعلومات الشخصية</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem
              icon="user"
              label={user?.full_name ?? ""}
              onPress={() => {
                setEditName(user?.full_name ?? "");
                setEditPhone(user?.phone ?? "");
                setEditModal(true);
              }}
            />
            <MenuItem icon="phone" label={user?.phone ?? "غير محدد"} />
            {role === "student" && (
              <MenuItem
                icon="book-open"
                label={user?.institution_id ?? "غير محدد"}
                isLast
              />
            )}
            {role === "driver" && (
              <MenuItem
                icon="truck"
                label={driver?.vehicle_info ?? "غير محدد"}
                isLast
              />
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>الإعدادات</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem icon="globe" label="اللغة" value="العربية" />
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
              value="فاتح"
              onPress={() => Alert.alert("قريباً", "الوضع الداكن قريباً")}
            />
            <MenuItem
              icon="map-pin"
              label="مشاركة الموقع"
              toggle
              toggleValue={locationShare}
              onToggle={(v) => {
                setLocationShare(v);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              isLast
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>الدعم والمشاركة</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem icon="headphones" label="الدعم الفني" onPress={handleSupport} />
            <MenuItem icon="share-2" label="شارك التطبيق" onPress={handleShare} />
            <MenuItem icon="star" label="قيّم التطبيق" onPress={() => Alert.alert("شكراً", "تقييمك يهمنا")} isLast />
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

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            يونيرايد العراق · النسخة 1.0.0
          </Text>
        </View>
      </ScrollView>

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
                style={[
                  styles.fieldInput,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                ]}
                value={editName}
                onChangeText={setEditName}
                textAlign="right"
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>رقم الهاتف</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                ]}
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                textAlign="right"
              />
            </View>
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
  avatarInner: {
    width: "100%",
    height: "100%",
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 36, fontFamily: "Inter_700Bold", color: "#fff" },
  editAvatarBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#1A3C6E",
  },
  userName: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 8 },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  roleChipText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", width: "100%" },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 2 },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  statDivider: { width: 1, height: "60%", alignSelf: "center" },
  content: { flex: 1 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: "right",
  },
  menuCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  menuItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "right" },
  menuRight: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  menuValue: { fontSize: 13, fontFamily: "Inter_400Regular" },
  subCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  subCardRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingVertical: 8 },
  subCardInfo: { flex: 1, alignItems: "flex-end" },
  subCardLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 2 },
  subCardValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  subCardDivider: { height: 1, marginVertical: 4 },
  footer: { alignItems: "center", marginTop: 10, marginBottom: 20 },
  footerText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  saveBtn: { fontSize: 15, fontFamily: "Inter_700Bold" },
  modalContent: { padding: 20 },
  field: { marginBottom: 20 },
  fieldLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right", marginBottom: 8 },
  fieldInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});