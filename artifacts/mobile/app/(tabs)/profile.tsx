import FeatherIcon from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
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

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser, tripHistory } = useApp();
  const [editModal, setEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState(user?.name ?? "");
  const [editPhone, setEditPhone] = useState(user?.phone ?? "");
  const [editUniversity, setEditUniversity] = useState(user?.university ?? "");
  const [editVehicle, setEditVehicle] = useState(user?.vehicleType ?? "");
  const [editPlate, setEditPlate] = useState(user?.vehiclePlate ?? "");
  const [editVehicleColor, setEditVehicleColor] = useState(user?.vehicleColor ?? "");
  const [editFareBasic, setEditFareBasic] = useState(user?.fareBasic?.toString() ?? "5000");
  const [notifications, setNotifications] = useState(true);
  const [locationShare, setLocationShare] = useState(true);

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
        fareBasic: role === "driver" ? parseInt(editFareBasic) || user?.fareBasic : undefined,
      } as any);
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
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completedTrips}</Text>
            <Text style={styles.statLabel}>رحلة</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Number(user?.rating ?? 5).toFixed(1)}</Text>
            <Text style={styles.statLabel}>التقييم</Text>
          </View>
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
                <MenuItem icon="dollar-sign" label={`السعر الأساسي: ${user.fareBasic ?? 5000} د.ع`} isLast />
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
              onToggle={(v) => { setNotifications(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
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
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    value={editVehicleColor}
                    onChangeText={setEditVehicleColor}
                    textAlign="right"
                    placeholder="مثال: أبيض"
                  />
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
});
