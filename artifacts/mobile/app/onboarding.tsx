import FeatherIcon from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { UserRole, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TESTIMONIALS = [
  { name: "أحمد", role: "طالب", quote: "أنقذني من تأخير المحاضرات!" },
  { name: "خالد", role: "سائق", quote: "دخل ثابت كل شهر" },
  { name: "سارة", role: "طالبة", quote: "أشعر بالأمان التام في كل رحلة" },
];

const UNIVERSITIES = [
  "جامعة بغداد", "الجامعة التكنولوجية", "جامعة المستنصرية", "جامعة النهرين",
  "الجامعة الإسلامية", "جامعة الكوفة", "جامعة البصرة", "جامعة الموصل",
  "جامعة كربلاء", "جامعة ذي قار", "جامعة ميسان", "جامعة واسط",
  "جامعة القادسية", "جامعة تكريت", "جامعة الأنبار", "جامعة كركوك",
  "جامعة ديالى", "كلية الطب / بغداد", "المعهد التقني بغداد"
];

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
  const [vehicleColor, setVehicleColor] = useState("white");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showUniDropdown, setShowUniDropdown] = useState(false);

  // Animations
  const logoAnim = useRef(new Animated.Value(0)).current;
  const featuresAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const errorAnim = useRef(new Animated.Value(-20)).current;
  const errorOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (screen === "welcome") {
      // Logo pulse/rotate
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(logoAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      ).start();

      // Sequential feature fade-in
      featuresAnims.forEach((anim, i) => {
        Animated.timing(anim, {
          toValue: 1,
          duration: 500,
          delay: 400 + i * 200,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [screen]);

  useEffect(() => {
    if (error) {
      Animated.parallel([
        Animated.spring(errorAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(errorOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      errorAnim.setValue(-20);
      errorOpacity.setValue(0);
    }
  }, [error]);

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
    if (!phone.trim()) { setError("رقم الهاتف مطلوب"); return; }
    if (authMode === "register" && !name.trim()) { setError("الاسم مطلوب"); return; }
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      if (authMode === "register") {
        const { token, user } = await api.post<{ token: string; user: any }>("/auth/register", {
          name: name.trim(),
          phone: phone.trim(),
          role,
          university: role === "student" ? (university.trim() || "جامعة بغداد") : undefined,
          vehicleType: role === "driver" ? (vehicleType.trim() || undefined) : undefined,
          vehiclePlate: role === "driver" ? (vehiclePlate.trim() || undefined) : undefined,
          vehicleColor: role === "driver" ? (vehicleColor || "أبيض") : undefined,
        });
        await login(user, token);
      } else {
        const { token, user } = await api.post<{ token: string; user: any }>("/auth/login", {
          phone: phone.trim(),
        });
        await login(user, token);
      }
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "حدث خطأ، حاول مرة أخرى");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  const logoRotation = logoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["-10deg", "10deg"],
  });

  const logoScale = logoAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1],
  });

  if (screen === "welcome") {
    return (
      <LinearGradient
        colors={["#0D2847", "#1A3C6E", "#1A3C6E"]}
        style={[styles.welcomeContainer, { paddingTop: insets.top + 40 }]}
      >
        <View style={styles.logoArea}>
          <Animated.View style={[
            styles.logoCircle, 
            { 
              backgroundColor: "rgba(255,107,53,0.15)",
              transform: [{ rotate: logoRotation }, { scale: logoScale }]
            }
          ]}>
            <FeatherIcon name="navigation" size={40} color="#FF6B35" />
          </Animated.View>
          <Text style={styles.appName}>يونيرايد</Text>
          <Text style={styles.appNameEn}>UniRide Iraq</Text>
          <Text style={styles.tagline}>ربط طلاب الجامعات بالسائقين{"\n"}بشكل آمن وموثوق</Text>
        </View>

        <View style={styles.testimonialContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            pagingEnabled
            snapToInterval={SCREEN_WIDTH - 48}
            decelerationRate="fast"
            contentContainerStyle={styles.testimonialContent}
          >
            {TESTIMONIALS.map((t, i) => (
              <View key={i} style={styles.testimonialCard}>
                <FeatherIcon name="quote" size={20} color="rgba(255,107,53,0.5)" />
                <Text style={styles.testimonialQuote}>{t.quote}</Text>
                <Text style={styles.testimonialAuthor}>{t.name} — {t.role}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.featuresGrid}>
          {[
            { icon: "shield", text: "رحلات آمنة" },
            { icon: "map-pin", text: "تتبع مباشر" },
            { icon: "credit-card", text: "اشتراك شهري" },
            { icon: "star", text: "سائقون موثوقون" },
          ].map((f, i) => (
            <Animated.View 
              key={f.text} 
              style={[styles.featureItem, { opacity: featuresAnims[i], transform: [{ translateY: featuresAnims[i].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}
            >
              <View style={[styles.featureIcon, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
                <FeatherIcon name={f.icon as any} size={20} color="#FF9E7A" />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </Animated.View>
          ))}
        </View>

        <View style={[styles.welcomeBottom, { paddingBottom: insets.bottom + 32 }]}>
          <TouchableOpacity onPress={goToRole} activeOpacity={0.85} style={styles.gradientBtnWrapper}>
            <LinearGradient
              colors={["#FF6B35", "#FF8C5A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.startBtn}
            >
              <Text style={styles.startBtnText}>ابدأ الآن</Text>
              <FeatherIcon name="arrow-left" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.disclaimer}>بالمتابعة، أنت توافق على شروط الاستخدام وسياسة الخصوصية</Text>
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
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => setScreen("welcome")}>
          <FeatherIcon name="arrow-right" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.roleTitle}>من أنت؟</Text>
        <Text style={styles.roleSubtitle}>اختر نوع حسابك للمتابعة</Text>
        <View style={[styles.roleCards, { paddingBottom: insets.bottom + 40 }]}>
          <TouchableOpacity
            style={[styles.roleCard, { backgroundColor: "rgba(255,255,255,0.1)" }]}
            onPress={() => selectRole("student")} activeOpacity={0.8}
          >
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>✓ مجاني للتسجيل</Text>
            </View>
            <View style={[styles.roleIconBig, { backgroundColor: "rgba(255,107,53,0.2)" }]}>
              <FeatherIcon name="book-open" size={36} color="#FF6B35" />
            </View>
            <Text style={styles.roleCardTitle}>طالب جامعي</Text>
            <Text style={styles.roleCardDesc}>اشترك مع سائق وتابع رحلتك اليومية إلى الجامعة بأمان</Text>
            <View style={[styles.roleArrow, { backgroundColor: "#FF6B35" }]}>
              <FeatherIcon name="arrow-left" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleCard, { backgroundColor: "rgba(255,255,255,0.1)" }]}
            onPress={() => selectRole("driver")} activeOpacity={0.8}
          >
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>✓ مجاني للتسجيل</Text>
            </View>
            <View style={[styles.roleIconBig, { backgroundColor: "rgba(91,141,239,0.2)" }]}>
              <FeatherIcon name="truck" size={36} color="#5B8DEF" />
            </View>
            <Text style={styles.roleCardTitle}>سائق</Text>
            <Text style={styles.roleCardDesc}>قدم خدمات النقل للطلاب واكسب دخلاً ثابتاً شهرياً</Text>
            <View style={[styles.roleArrow, { backgroundColor: "#5B8DEF" }]}>
              <FeatherIcon name="arrow-left" size={16} color="#fff" />
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
        <View style={styles.progressContainerSmall}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => setScreen("role")}>
          <FeatherIcon name="arrow-right" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.authHeaderContent}>
          <View style={[styles.roleTag, { backgroundColor: role === "student" ? "#FF6B35" : "#5B8DEF" }]}>
            <FeatherIcon name={role === "student" ? "book-open" : "truck"} size={14} color="#fff" />
            <Text style={styles.roleTagText}>{role === "student" ? "طالب" : "سائق"}</Text>
          </View>
          <Text style={styles.authTitle}>{authMode === "login" ? "مرحباً بعودتك" : "إنشاء حساب جديد"}</Text>
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
            onPress={() => { setAuthMode("login"); setError(""); }}
          >
            <Text style={[styles.toggleBtnText, { color: authMode === "login" ? "#fff" : colors.mutedForeground }]}>تسجيل الدخول</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, authMode === "register" && { backgroundColor: colors.primary }]}
            onPress={() => { setAuthMode("register"); setError(""); }}
          >
            <Text style={[styles.toggleBtnText, { color: authMode === "register" ? "#fff" : colors.mutedForeground }]}>حساب جديد</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <Animated.View style={[
            styles.errorBox, 
            { 
              backgroundColor: "#FEE2E2",
              opacity: errorOpacity,
              transform: [{ translateY: errorAnim }]
            }
          ]}>
            <FeatherIcon name="alert-circle" size={14} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        ) : null}

        {authMode === "register" && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>الاسم الكامل</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={name} onChangeText={setName}
              placeholder="أدخل اسمك الكامل" placeholderTextColor={colors.mutedForeground} textAlign="right"
            />
          </View>
        )}

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>رقم الهاتف</Text>
          <View style={styles.phoneInputContainer}>
            <TextInput
              style={[styles.input, styles.phoneInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={phone} onChangeText={setPhone}
              placeholder="07XX XXX XXXX" placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad" textAlign="right"
            />
            <View style={styles.phonePrefix}>
              <Text style={styles.phonePrefixText}>+964 🇮🇶</Text>
            </View>
          </View>
        </View>

        {authMode === "register" && role === "student" && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>الجامعة</Text>
            <TouchableOpacity 
              style={[styles.input, styles.dropdownTrigger, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowUniDropdown(!showUniDropdown)}
            >
              <FeatherIcon name={showUniDropdown ? "chevron-up" : "chevron-down"} size={20} color={colors.mutedForeground} />
              <Text style={[styles.dropdownValue, { color: university ? colors.foreground : colors.mutedForeground }]}>
                {university || "اختر الجامعة"}
              </Text>
            </TouchableOpacity>
            
            {showUniDropdown && (
              <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {UNIVERSITIES.map((uni) => (
                    <TouchableOpacity 
                      key={uni} 
                      style={styles.dropdownItem}
                      onPress={() => {
                        setUniversity(uni);
                        setShowUniDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, { color: colors.foreground }]}>{uni}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {authMode === "register" && role === "driver" && (
          <>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>لون السيارة</Text>
              <View style={styles.colorPicker}>
                {["white", "black", "#C0C0C0", "#DC2626", "#2563EB"].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c, borderColor: vehicleColor === (c === "white" ? "أبيض" : c === "black" ? "أسود" : c === "#C0C0C0" ? "فضي" : c === "#DC2626" ? "أحمر" : "أزرق") ? colors.primary : "transparent", borderWidth: 2 }
                    ]}
                    onPress={() => setVehicleColor(c === "white" ? "أبيض" : c === "black" ? "أسود" : c === "#C0C0C0" ? "فضي" : c === "#DC2626" ? "أحمر" : "أزرق")}
                  />
                ))}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>نوع السيارة</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={vehicleType} onChangeText={setVehicleType}
                placeholder="مثال: تويوتا كامري" placeholderTextColor={colors.mutedForeground} textAlign="right"
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>رقم اللوحة</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={vehiclePlate} onChangeText={setVehiclePlate}
                placeholder="مثال: ب 1234 بغداد" placeholderTextColor={colors.mutedForeground} textAlign="right"
              />
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.authBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={handleAuth} disabled={loading} activeOpacity={0.85}
        >
          {loading ? (
            <LoadingText />
          ) : (
            <>
              <Text style={styles.authBtnText}>{authMode === "login" ? "دخول" : "إنشاء الحساب"}</Text>
              <FeatherIcon name="arrow-left" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LoadingText() {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 400);
    return () => clearInterval(interval);
  }, []);
  return <Text style={styles.authBtnText}>جارٍ التحقق{dots}</Text>;
}

const styles = StyleSheet.create({
  welcomeContainer: { flex: 1, paddingHorizontal: 24 },
  logoArea: { alignItems: "center", marginBottom: 30 },
  logoCircle: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  appName: { fontSize: 36, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 4 },
  appNameEn: { fontSize: 16, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", marginBottom: 16, letterSpacing: 2 },
  tagline: { fontSize: 16, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", textAlign: "center", lineHeight: 26 },
  
  testimonialContainer: { height: 100, marginBottom: 20 },
  testimonialContent: { gap: 12, paddingHorizontal: 12 },
  testimonialCard: { width: SCREEN_WIDTH - 72, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 16, padding: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  testimonialQuote: { color: "#fff", fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center", marginBottom: 4 },
  testimonialAuthor: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "Inter_400Regular" },

  featuresGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", marginVertical: 20 },
  featureItem: { width: "44%", alignItems: "center", gap: 8 },
  featureIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  featureText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.85)", textAlign: "center" },
  
  welcomeBottom: { alignItems: "center", gap: 14 },
  gradientBtnWrapper: { width: "100%", borderRadius: 30, overflow: "hidden" },
  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, paddingHorizontal: 40, gap: 10 },
  startBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
  disclaimer: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", textAlign: "center" },
  
  progressContainer: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 20 },
  progressContainerSmall: { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 10 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.2)" },
  progressDotActive: { backgroundColor: "#FF6B35", width: 20 },

  roleContainer: { flex: 1, paddingHorizontal: 24 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  roleTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 8, textAlign: "right" },
  roleSubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginBottom: 24, textAlign: "right" },
  roleCards: { flex: 1, gap: 16 },
  roleCard: { borderRadius: 20, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", position: "relative" },
  roleBadge: { position: "absolute", top: 12, left: 12, backgroundColor: "rgba(34, 197, 94, 0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  roleBadgeText: { color: "#22C55E", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  roleIconBig: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", marginBottom: 16, alignSelf: "flex-end" },
  roleCardTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 8, textAlign: "right" },
  roleCardDesc: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", lineHeight: 22, textAlign: "right", marginBottom: 16 },
  roleArrow: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  
  authContainer: { flex: 1 },
  authHeader: { paddingHorizontal: 20, paddingBottom: 24 },
  authHeaderContent: { alignItems: "flex-end" },
  roleTag: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5, marginBottom: 10 },
  roleTagText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  authTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" },
  authForm: { flex: 1 },
  authFormContent: { padding: 20, gap: 16 },
  authToggle: { flexDirection: "row", backgroundColor: "#E8EDF5", borderRadius: 12, padding: 4, marginBottom: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  toggleBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10 },
  errorText: { color: "#DC2626", fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, textAlign: "right" },
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "right" },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: "Inter_400Regular" },
  
  phoneInputContainer: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  phoneInput: { flex: 1 },
  phonePrefix: { backgroundColor: "#F1F5F9", paddingHorizontal: 12, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  phonePrefixText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#64748B" },

  dropdownTrigger: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dropdownValue: { fontSize: 15, fontFamily: "Inter_400Regular", flex: 1, textAlign: "right" },
  dropdownList: { borderRadius: 12, borderWidth: 1, marginTop: 4, overflow: "hidden" },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  dropdownItemText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "right" },

  colorPicker: { flexDirection: "row-reverse", gap: 12, marginTop: 4 },
  colorCircle: { width: 32, height: 32, borderRadius: 16 },

  authBtn: { borderRadius: 14, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 8 },
  authBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});

