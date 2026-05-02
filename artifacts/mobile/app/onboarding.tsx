import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { User, UserRole, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type Screen = "welcome" | "role" | "auth";
type AuthMode = "login" | "register";

export default function Onboarding() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useApp();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [role, setRole] = useState<UserRole>("student");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [university, setUniversity] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [loading, setLoading] = useState(false);

  function goToRole() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScreen("role");
  }

  function selectRole(r: UserRole) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRole(r);
    setScreen("auth");
  }

  async function handleAuth() {
    if (!phone.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));

    const user: User = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      name: name.trim() || (role === "student" ? "الطالب" : "السائق"),
      phone: phone.trim(),
      role,
      university: role === "student" ? (university.trim() || "جامعة بغداد") : undefined,
      vehicleType: role === "driver" ? (vehicleType.trim() || "تويوتا كامري") : undefined,
      vehiclePlate: role === "driver" ? (vehiclePlate.trim() || "ب 0000 بغداد") : undefined,
      vehicleColor: role === "driver" ? "أبيض" : undefined,
      rating: 5.0,
      totalTrips: 0,
      isOnline: false,
      balance: role === "driver" ? 0 : undefined,
    };

    await login(user);
    setLoading(false);
    router.replace("/(tabs)");
  }

  if (screen === "welcome") {
    return (
      <LinearGradient
        colors={["#0D2847", "#1A3C6E", "#1A3C6E"]}
        style={[styles.welcomeContainer, { paddingTop: insets.top + 60 }]}
      >
        <View style={styles.logoArea}>
          <View style={[styles.logoCircle, { backgroundColor: "rgba(255,107,53,0.15)" }]}>
            <Feather name="navigation" size={40} color="#FF6B35" />
          </View>
          <Text style={styles.appName}>يونيرايد</Text>
          <Text style={styles.appNameEn}>UniRide Iraq</Text>
          <Text style={styles.tagline}>ربط طلاب الجامعات بالسائقين{"\n"}بشكل آمن وموثوق</Text>
        </View>

        <View style={styles.featuresGrid}>
          {[
            { icon: "shield", text: "رحلات آمنة" },
            { icon: "map-pin", text: "تتبع مباشر" },
            { icon: "credit-card", text: "اشتراك شهري" },
            { icon: "star", text: "سائقون موثوقون" },
          ].map((f) => (
            <View key={f.text} style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
                <Feather name={f.icon as any} size={20} color="#FF9E7A" />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.welcomeBottom, { paddingBottom: insets.bottom + 32 }]}>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={goToRole}
            activeOpacity={0.85}
          >
            <Text style={styles.startBtnText}>ابدأ الآن</Text>
            <Feather name="arrow-left" size={18} color="#1A3C6E" />
          </TouchableOpacity>
          <Text style={styles.disclaimer}>
            بالمتابعة، أنت توافق على شروط الاستخدام وسياسة الخصوصية
          </Text>
        </View>
      </LinearGradient>
    );
  }

  if (screen === "role") {
    return (
      <LinearGradient
        colors={["#0D2847", "#1A3C6E"]}
        style={[styles.roleContainer, { paddingTop: insets.top + 20 }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => setScreen("welcome")}>
          <Feather name="arrow-right" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.roleTitle}>من أنت؟</Text>
        <Text style={styles.roleSubtitle}>اختر نوع حسابك للمتابعة</Text>

        <View style={[styles.roleCards, { paddingBottom: insets.bottom + 40 }]}>
          <TouchableOpacity
            style={[styles.roleCard, { backgroundColor: "rgba(255,255,255,0.1)" }]}
            onPress={() => selectRole("student")}
            activeOpacity={0.8}
          >
            <View style={[styles.roleIconBig, { backgroundColor: "rgba(255,107,53,0.2)" }]}>
              <Feather name="book-open" size={36} color="#FF6B35" />
            </View>
            <Text style={styles.roleCardTitle}>طالب جامعي</Text>
            <Text style={styles.roleCardDesc}>اشترك مع سائق وتابع رحلتك اليومية إلى الجامعة بأمان</Text>
            <View style={[styles.roleArrow, { backgroundColor: "#FF6B35" }]}>
              <Feather name="arrow-left" size={16} color="#fff" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleCard, { backgroundColor: "rgba(255,255,255,0.1)" }]}
            onPress={() => selectRole("driver")}
            activeOpacity={0.8}
          >
            <View style={[styles.roleIconBig, { backgroundColor: "rgba(91,141,239,0.2)" }]}>
              <Feather name="truck" size={36} color="#5B8DEF" />
            </View>
            <Text style={styles.roleCardTitle}>سائق</Text>
            <Text style={styles.roleCardDesc}>قدم خدمات النقل للطلاب واكسب دخلاً ثابتاً شهرياً</Text>
            <View style={[styles.roleArrow, { backgroundColor: "#5B8DEF" }]}>
              <Feather name="arrow-left" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.authContainer, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={["#0D2847", "#1A3C6E"]}
        style={[styles.authHeader, { paddingTop: insets.top + 16 }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => setScreen("role")}>
          <Feather name="arrow-right" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.authHeaderContent}>
          <View style={[styles.roleTag, { backgroundColor: role === "student" ? "#FF6B35" : "#5B8DEF" }]}>
            <Feather name={role === "student" ? "book-open" : "truck"} size={14} color="#fff" />
            <Text style={styles.roleTagText}>{role === "student" ? "طالب" : "سائق"}</Text>
          </View>
          <Text style={styles.authTitle}>
            {authMode === "login" ? "مرحباً بعودتك" : "إنشاء حساب جديد"}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.authForm}
        contentContainerStyle={[styles.authFormContent, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.authToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, authMode === "login" && { backgroundColor: colors.primary }]}
            onPress={() => setAuthMode("login")}
          >
            <Text style={[styles.toggleBtnText, { color: authMode === "login" ? "#fff" : colors.mutedForeground }]}>
              تسجيل الدخول
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, authMode === "register" && { backgroundColor: colors.primary }]}
            onPress={() => setAuthMode("register")}
          >
            <Text style={[styles.toggleBtnText, { color: authMode === "register" ? "#fff" : colors.mutedForeground }]}>
              حساب جديد
            </Text>
          </TouchableOpacity>
        </View>

        {authMode === "register" && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>الاسم الكامل</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={name}
              onChangeText={setName}
              placeholder="أدخل اسمك الكامل"
              placeholderTextColor={colors.mutedForeground}
              textAlign="right"
            />
          </View>
        )}

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>رقم الهاتف</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={phone}
            onChangeText={setPhone}
            placeholder="07XX XXX XXXX"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="phone-pad"
            textAlign="right"
          />
        </View>

        {authMode === "register" && role === "student" && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>الجامعة</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={university}
              onChangeText={setUniversity}
              placeholder="مثال: جامعة بغداد"
              placeholderTextColor={colors.mutedForeground}
              textAlign="right"
            />
          </View>
        )}

        {authMode === "register" && role === "driver" && (
          <>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>نوع السيارة</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={vehicleType}
                onChangeText={setVehicleType}
                placeholder="مثال: تويوتا كامري"
                placeholderTextColor={colors.mutedForeground}
                textAlign="right"
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>رقم اللوحة</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={vehiclePlate}
                onChangeText={setVehiclePlate}
                placeholder="مثال: ب 1234 بغداد"
                placeholderTextColor={colors.mutedForeground}
                textAlign="right"
              />
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.authBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={handleAuth}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <Text style={styles.authBtnText}>جارٍ التحقق...</Text>
          ) : (
            <>
              <Text style={styles.authBtnText}>
                {authMode === "login" ? "دخول" : "إنشاء الحساب"}
              </Text>
              <Feather name="arrow-left" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  welcomeContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  logoArea: {
    alignItems: "center",
    flex: 1,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  appName: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  appNameEn: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    marginBottom: 20,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 26,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    marginVertical: 32,
  },
  featureItem: {
    width: "44%",
    alignItems: "center",
    gap: 8,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
  welcomeBottom: {
    alignItems: "center",
    gap: 14,
  },
  startBtn: {
    backgroundColor: "#FF6B35",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    gap: 10,
    width: "100%",
  },
  startBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
  },
  roleContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  roleTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 8,
    textAlign: "right",
  },
  roleSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
    marginBottom: 32,
    textAlign: "right",
  },
  roleCards: {
    flex: 1,
    gap: 16,
  },
  roleCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  roleIconBig: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    alignSelf: "flex-end",
  },
  roleCardTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 8,
    textAlign: "right",
  },
  roleCardDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    lineHeight: 22,
    textAlign: "right",
    marginBottom: 16,
  },
  roleArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  authContainer: {
    flex: 1,
  },
  authHeader: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  authHeaderContent: {
    alignItems: "flex-end",
  },
  roleTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
    marginBottom: 10,
  },
  roleTagText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  authTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  authForm: {
    flex: 1,
  },
  authFormContent: {
    padding: 20,
    gap: 16,
  },
  authToggle: {
    flexDirection: "row",
    backgroundColor: "#E8EDF5",
    borderRadius: 12,
    padding: 4,
    marginBottom: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "right",
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  authBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  authBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
