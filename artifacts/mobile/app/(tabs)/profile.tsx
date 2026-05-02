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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser, tripHistory } = useApp();
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.name ?? "");
  const [editPhone, setEditPhone] = useState(user?.phone ?? "");
  const [editUniversity, setEditUniversity] = useState(user?.university ?? "");
  const [editVehicle, setEditVehicle] = useState(user?.vehicleType ?? "");
  const [editPlate, setEditPlate] = useState(user?.vehiclePlate ?? "");
  const [notifications, setNotifications] = useState(true);
  const [locationShare, setLocationShare] = useState(true);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const role = user?.role ?? "student";

  const completedTrips = tripHistory.filter((t) => t.status === "completed").length;

  async function handleSave() {
    await updateUser({
      name: editName.trim() || user?.name,
      phone: editPhone.trim() || user?.phone,
      university: role === "student" ? editUniversity.trim() || user?.university : user?.university,
      vehicleType: role === "driver" ? editVehicle.trim() || user?.vehicleType : user?.vehicleType,
      vehiclePlate: role === "driver" ? editPlate.trim() || user?.vehiclePlate : user?.vehiclePlate,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditModal(false);
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
          <View style={[styles.avatar, { backgroundColor: role === "student" ? "#FF6B35" : "#5B8DEF" }]}>
            <Text style={styles.avatarText}>{user?.name.charAt(0)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.editAvatarBtn, { backgroundColor: "rgba(255,255,255,0.2)" }]}
            onPress={() => setEditModal(true)}
          >
            <FeatherIcon name="edit-2" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <View style={styles.roleChip}>
          <FeatherIcon name={role === "student" ? "book-open" : "truck"} size={12} color="#fff" />
          <Text style={styles.roleChipText}>{role === "student" ? "طالب جامعي" : "سائق"}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completedTrips}</Text>
            <Text style={styles.statLabel}>رحلة</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>التقييم</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{role === "student" ? (user?.university?.split(" ")[1] ?? "—") : (user?.vehicleType?.split(" ")[0] ?? "—")}</Text>
            <Text style={styles.statLabel}>{role === "student" ? "الجامعة" : "السيارة"}</Text>
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
                <MenuItem icon="hash" label={user?.vehiclePlate ?? "—"} isLast />
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>الإعدادات</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          UniRide Iraq · ربط الطلاب بالسائقين
        </Text>
      </ScrollView>

      <Modal visible={editModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderColor: colors.border }]}>
            <TouchableOpacity onPress={() => setEditModal(false)}>
              <FeatherIcon name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>تعديل الملف</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.saveBtn, { color: colors.primary }]}>حفظ</Text>
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
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#fff" },
  editAvatarBtn: { position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  userName: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 6 },
  roleChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 20 },
  roleChipText: { color: "#fff", fontSize: 12, fontFamily: "Inter_500Medium" },
  statsRow: { flexDirection: "row", width: "100%" },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 2 },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  statDivider: { width: 1 },
  content: { flex: 1 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  menuCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuIcon: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  menuRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  menuValue: { fontSize: 13, fontFamily: "Inter_400Regular" },
  footer: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  saveBtn: { fontSize: 15, fontFamily: "Inter_700Bold" },
  modalContent: { padding: 20 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "right", marginBottom: 6 },
  fieldInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: "Inter_400Regular" },
});
