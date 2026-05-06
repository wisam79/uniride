import FeatherIcon from "@/components/FeatherIcon";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState, useEffect, useRef, useCallback } from "react";
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

import { useAuth, type UserRole } from "@/context";
import { useColors } from "@/hooks/useColors";
import { IRAQI_UNIVERSITIES } from "@/lib/utils";
import { api } from "@/lib/api";
import { FontAwesome } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const TESTIMONIALS = [
  { name: "أحمد", role: "طالب", quote: "أنقذني من تأخير المحاضرات!" },
  { name: "خالد", role: "سائق", quote: "دخل ثابت كل شهر" },
  { name: "سارة", role: "طالبة", quote: "أشعر بالأمان التام في كل رحلة" },
];

const UNIVERSITIES = IRAQI_UNIVERSITIES.map((u) => u.name);

type Screen = "welcome" | "role" | "auth" | "otp";
type AuthMode = "login" | "register";

const OTP_RESEND_SECONDS = 60;

export default function Onboarding() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signInWithEmail, signInWithGoogle, verifyOtp: verifyOtpCode, registerProfile, updateProfile, user, isAuthenticated, isLoading } = useAuth();

  const [screen, setScreen] = useState<Screen>("welcome");
  const [role, setRole] = useState<UserRole>("student");
  const [authMode, setAuthMode] = useState<AuthMode>("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [university, setUniversity] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleColor, setVehicleColor] = useState("أبيض");
  const [showUniDropdown, setShowUniDropdown] = useState(false);

  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(TextInput | null)[]>([null, null, null, null, null, null]);
  const [resendTimer, setResendTimer] = useState(0);
  const resendInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; name?: string }>({});

  const logoAnim = useRef(new Animated.Value(0)).current;
  const featuresAnims = useRef([0, 0, 0, 0].map(() => new Animated.Value(0))).current;
  const errorAnim = useRef(new Animated.Value(-20)).current;
  const errorOpacity = useRef(new Animated.Value(0)).current;
  const otpShakeAnim = useRef(new Animated.Value(0)).current;

  const particles = useRef(
    [...Array(6)].map(() => ({
      x: Math.random() * SCREEN_WIDTH,
      y: Math.random() * 500,
      anim: new Animated.Value(0),
      duration: 3000 + Math.random() * 4000,
    }))
  ).current;

  useEffect(() => {
    particles.forEach((p) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(p.anim, { toValue: 1, duration: p.duration, useNativeDriver: true }),
          Animated.timing(p.anim, { toValue: 0, duration: p.duration, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  useEffect(() => {
    if (screen === "welcome") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(logoAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
      featuresAnims.forEach((anim, i) => {
        Animated.timing(anim, { toValue: 1, duration: 500, delay: 400 + i * 200, useNativeDriver: true }).start();
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

  useEffect(() => {
    return () => {
      if (resendInterval.current) clearInterval(resendInterval.current);
    };
  }, []);

  const startResendTimer = useCallback(() => {
    setResendTimer(OTP_RESEND_SECONDS);
    if (resendInterval.current) clearInterval(resendInterval.current);
    resendInterval.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(resendInterval.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const shakeOtp = useCallback(() => {
    otpShakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(otpShakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(otpShakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(otpShakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(otpShakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [otpShakeAnim]);

  const logoRotation = logoAnim.interpolate({ inputRange: [0, 1], outputRange: ["-10deg", "10deg"] });
  const logoScale = logoAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.1, 1] });

  function goToRole() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScreen("role");
  }

  function selectRole(r: UserRole) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRole(r);
    setScreen("auth");
  }

  async function handleSendOtp() {
    const newErrors: { email?: string; name?: string } = {};
    const trimEmail = email.trim();

    if (!trimEmail) {
      newErrors.email = "البريد الإلكتروني مطلوب";
    } else if (!/^\S+@\S+\.\S+$/.test(trimEmail)) {
      newErrors.email = "صيغة البريد الإلكتروني غير صحيحة";
    }

    if (authMode === "register" && !name.trim()) {
      newErrors.name = "الاسم مطلوب";
    } else if (authMode === "register" && name.trim().length < 2) {
      newErrors.name = "الاسم يجب أن يكون حرفين على الأقل";
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setError("يرجى تصحيح الأخطاء");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setFieldErrors({});
    setError("");
    setLoading(true);

    try {
      await signInWithEmail(trimEmail);
      setOtpDigits(["", "", "", "", "", ""]);
      setDevCode(null);
      startResendTimer();
      setScreen("otp");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err.message ?? "حدث خطأ، حاول مرة أخرى");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    const code = otpDigits.join("");
    if (code.length !== 6) {
      setError("أدخل الرمز المكوّن من 6 أرقام");
      shakeOtp();
      return;
    }

     setError("");
     setLoading(true);

     try {
       await verifyOtpCode(email.trim(), code);

       if (authMode === "register") {
         await registerProfile({
           fullName: name.trim(),
           role,
           institutionId: role === "student" ? (university.trim() || undefined) : undefined,
           vehicleInfo: role === "driver" ? `${vehicleType.trim() || ""} ${vehicleColor} ${vehiclePlate.trim() || ""}`.trim() : undefined,
         });
       }

      setShowSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => router.replace("/(tabs)"), 1500);
    } catch (err: any) {
      const msg = err?.message ?? "رمز التحقق غير صحيح";
      setError(msg);
      shakeOtp();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendTimer > 0) return;
    setLoading(true);
    setError("");
    try {
      await signInWithEmail(email.trim());
      setOtpDigits(["", "", "", "", "", ""]);
      setDevCode(null);
      startResendTimer();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setTimeout(() => otpRefs.current[0]?.focus(), 200);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "فشل إعادة الإرسال");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    try {
      await signInWithGoogle();
      setShowSuccess(true);
      setTimeout(() => router.replace("/(tabs)"), 1500);
    } catch (err: any) {
      setError("فشل تسجيل الدخول عبر Google");
    } finally {
      setLoading(false);
    }
  }

  function handleOtpDigit(text: string, index: number) {
    const digit = text.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setError("");

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    if (newDigits.every((d) => d !== "") && newDigits.join("").length === 6) {
      setTimeout(() => handleVerifyOtpAuto(newDigits.join("")), 100);
    }
  }

  function handleOtpKeyPress(key: string, index: number) {
    if (key === "Backspace") {
      const newDigits = [...otpDigits];
      if (newDigits[index]) {
        newDigits[index] = "";
        setOtpDigits(newDigits);
      } else if (index > 0) {
        newDigits[index - 1] = "";
        setOtpDigits(newDigits);
        otpRefs.current[index - 1]?.focus();
      }
    }
  }

  async function handleVerifyOtpAuto(code: string) {
    setLoading(true);
    setError("");
    try {
      await verifyOtpCode(email.trim(), code);

      if (authMode === "register") {
        await registerProfile({
          fullName: name.trim(),
          role,
          institutionId: role === "student" ? (university.trim() || undefined) : undefined,
          vehicleInfo: role === "driver" ? `${vehicleType.trim() || ""} ${vehicleColor} ${vehiclePlate.trim() || ""}`.trim() : undefined,
        });
      }

      setShowSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => router.replace("/(tabs)"), 1500);
    } catch (err: any) {
      const msg = err?.message ?? "رمز التحقق غير صحيح";
      setError(msg);
      shakeOtp();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  const BackgroundParticles = () => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              left: p.x,
              top: p.y,
              opacity: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.15] }),
              transform: [{ translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] }) }],
            },
          ]}
        />
      ))}
    </View>
  );

  if (isLoading) {
    return (
      <LinearGradient colors={["#0D2847", "#1A3C6E"]} style={styles.loadingContainer}>
        <Animated.View style={{ transform: [{ rotate: logoRotation }, { scale: logoScale }] }}>
          <FeatherIcon name="navigation" size={60} color="#FF6B35" />
        </Animated.View>
        <LoadingText label="جاري التحميل" />
      </LinearGradient>
    );
  }

  if (showSuccess) {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.background }]}>
        <FeatherIcon name="check-circle" size={80} color="#22C55E" />
        <Text style={[styles.successTitle, { color: colors.foreground }]}>مرحباً بك في يونيرايد!</Text>
      </View>
    );
  }

  if (screen === "welcome") {
    return (
      <LinearGradient colors={["#0D2847", "#1A3C6E", "#1A3C6E"]} style={[styles.welcomeContainer, { paddingTop: insets.top + 40 }]}>
        <BackgroundParticles />
        <View style={styles.logoArea}>
          <Animated.View style={[styles.logoCircle, { backgroundColor: "rgba(255,107,53,0.15)", transform: [{ rotate: logoRotation }, { scale: logoScale }] }]}>
            <FeatherIcon name="navigation" size={40} color="#FF6B35" />
          </Animated.View>
          <Text style={styles.appName}>يونيرايد</Text>
          <Text style={styles.appNameEn}>UniRide Iraq</Text>
          <Text style={styles.tagline}>ربط طلاب الجامعات بالسائقين{"\n"}بشكل آمن وموثوق</Text>
        </View>

        <View style={styles.testimonialContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled snapToInterval={SCREEN_WIDTH - 48} decelerationRate="fast" contentContainerStyle={styles.testimonialContent}>
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
            <Animated.View key={f.text} style={[styles.featureItem, { opacity: featuresAnims[i], transform: [{ translateY: featuresAnims[i]!.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
              <View style={[styles.featureIcon, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
                <FeatherIcon name={f.icon as any} size={20} color="#FF9E7A" />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </Animated.View>
          ))}
        </View>

        <View style={[styles.welcomeBottom, { paddingBottom: insets.bottom + 32 }]}>
          <TouchableOpacity onPress={goToRole} activeOpacity={0.85} style={styles.gradientBtnWrapper}>
            <LinearGradient colors={["#FF6B35", "#FF8C5A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.startBtn}>
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
      <LinearGradient colors={["#0D2847", "#1A3C6E"]} style={[styles.roleContainer, { paddingTop: insets.top + 20 }]}>
        <BackgroundParticles />
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
          {[
            { r: "student" as UserRole, icon: "book-open", color: "#FF6B35", bg: "rgba(255,107,53,0.2)", title: "طالب جامعي", desc: "اشترك مع سائق وتابع رحلتك اليومية إلى الجامعة بأمان" },
            { r: "driver" as UserRole, icon: "truck", color: "#5B8DEF", bg: "rgba(91,141,239,0.2)", title: "سائق", desc: "قدم خدمات النقل للطلاب واكسب دخلاً ثابتاً شهرياً" },
          ].map((item) => (
            <TouchableOpacity key={item.r} style={[styles.roleCard, { backgroundColor: "rgba(255,255,255,0.1)" }]} onPress={() => selectRole(item.r)} activeOpacity={0.8}>
              <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>✓ مجاني للتسجيل</Text></View>
              <View style={[styles.roleIconBig, { backgroundColor: item.bg }]}>
                <FeatherIcon name={item.icon as any} size={36} color={item.color} />
              </View>
              <Text style={styles.roleCardTitle}>{item.title}</Text>
              <Text style={styles.roleCardDesc}>{item.desc}</Text>
              <View style={[styles.roleArrow, { backgroundColor: item.color }]}>
                <FeatherIcon name="arrow-left" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>
    );
  }

  if (screen === "otp") {
    const otpCode = otpDigits.join("");
    return (
      <KeyboardAvoidingView style={[styles.authContainer, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <LinearGradient colors={["#0D2847", "#1A3C6E"]} style={[styles.authHeader, { paddingTop: insets.top + 16 }]}>
          <View style={styles.progressContainerSmall}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.progressDot, i <= 2 && styles.progressDotActive]} />
            ))}
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={() => { setScreen("auth"); setError(""); }}>
            <FeatherIcon name="arrow-right" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.authHeaderContent}>
            <Text style={styles.authTitle}>أدخل رمز التحقق</Text>
            <Text style={styles.authSubtitle}>
              تم إرسال رمز مكوّن من 6 أرقام إلى البريد الإلكتروني{"\n"}
              <Text style={{ color: "#FF6B35", fontFamily: "Inter_700Bold" }}>{email}</Text>
            </Text>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={[styles.authFormContent, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.otpIllustration}>
            <View style={[styles.otpIconCircle, { backgroundColor: "#FF6B35" + "20" }]}>
              <FeatherIcon name="mail" size={36} color="#FF6B35" />
            </View>
            <Text style={[styles.otpHint, { color: colors.mutedForeground }]}>
              {devCode ? "الرمز يظهر أدناه — اضغط عليه للتعبئة التلقائية" : "تحقق من بريدك الإلكتروني وأدخل الرمز هنا"}
            </Text>
          </View>

          {devCode ? (
            <TouchableOpacity
              style={styles.devCodeBanner}
              onPress={() => {
                const digits = devCode.split("");
                setOtpDigits(digits);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setTimeout(() => handleVerifyOtp(), 100);
              }}
              activeOpacity={0.75}
            >
              <View style={styles.devCodeTop}>
                <FeatherIcon name="zap" size={14} color="#92400E" />
                <Text style={styles.devCodeLabel}>وضع التطوير — اضغط للتعبئة التلقائية</Text>
              </View>
              <Text style={styles.devCodeValue}>{devCode}</Text>
              <Text style={styles.devCodeSub}>سيختفي هذا عند تفعيل البريد الإلكتروني</Text>
            </TouchableOpacity>
          ) : null}

          {error ? (
            <Animated.View style={[styles.errorBox, { backgroundColor: "#FEE2E2", opacity: errorOpacity, transform: [{ translateY: errorAnim }] }]}>
              <FeatherIcon name="alert-circle" size={14} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          ) : null}

          <Animated.View style={[styles.otpRow, { transform: [{ translateX: otpShakeAnim }] }]}>
            {otpDigits.map((digit, i) => (
              <TextInput
                key={i}
                ref={(r) => { otpRefs.current[i] = r; }}
                style={[
                  styles.otpInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: digit ? colors.primary : error ? "#EF4444" : colors.border,
                    color: colors.foreground,
                    borderWidth: digit ? 2 : 1,
                  },
                ]}
                value={digit}
                onChangeText={(t) => handleOtpDigit(t, i)}
                onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
              />
            ))}
          </Animated.View>

          <TouchableOpacity
            style={[styles.authBtn, { backgroundColor: colors.primary, opacity: loading || otpCode.length !== 6 ? 0.7 : 1, marginTop: 8 }]}
            onPress={handleVerifyOtp}
            disabled={loading || otpCode.length !== 6}
            activeOpacity={0.85}
          >
            {loading ? <LoadingText label="جاري التحقق" /> : (
              <>
                <Text style={styles.authBtnText}>تأكيد الرمز</Text>
                <FeatherIcon name="check" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.resendRow}>
            {resendTimer > 0 ? (
              <Text style={[styles.resendHint, { color: colors.mutedForeground }]}>
                إعادة الإرسال بعد <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>{resendTimer}</Text> ثانية
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                <Text style={[styles.resendBtn, { color: colors.primary }]}>
                  ⟳ إعادة إرسال الرمز عبر البريد الإلكتروني
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.whatsappNote, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
            <FeatherIcon name="info" size={14} color={colors.primary} />
            <Text style={[styles.whatsappNoteText, { color: colors.mutedForeground }]}>
              الرمز صالح لمدة 5 دقائق فقط ولا يمكن استخدامه مرتين
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.authContainer, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={["#0D2847", "#1A3C6E"]} style={[styles.authHeader, { paddingTop: insets.top + 16 }]}>
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

      <ScrollView style={styles.authForm} contentContainerStyle={[styles.authFormContent, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.authToggle}>
          <TouchableOpacity style={[styles.toggleBtn, authMode === "login" && { backgroundColor: colors.primary }]} onPress={() => { setAuthMode("login"); setError(""); setFieldErrors({}); }}>
            <Text style={[styles.toggleBtnText, { color: authMode === "login" ? "#fff" : colors.mutedForeground }]}>تسجيل الدخول</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, authMode === "register" && { backgroundColor: colors.primary }]} onPress={() => { setAuthMode("register"); setError(""); setFieldErrors({}); }}>
            <Text style={[styles.toggleBtnText, { color: authMode === "register" ? "#fff" : colors.mutedForeground }]}>حساب جديد</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <Animated.View style={[styles.errorBox, { backgroundColor: "#FEE2E2", opacity: errorOpacity, transform: [{ translateY: errorAnim }] }]}>
            <FeatherIcon name="alert-circle" size={14} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        ) : null}

        {authMode === "register" && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>الاسم الكامل</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: fieldErrors.name ? "#EF4444" : colors.border, color: colors.foreground }]}
              value={name} onChangeText={setName}
              placeholder="أدخل اسمك الكامل" placeholderTextColor={colors.mutedForeground} textAlign="right"
            />
            {fieldErrors.name && <Text style={styles.fieldError}>{fieldErrors.name}</Text>}
          </View>
        )}

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>البريد الإلكتروني</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: fieldErrors.email ? "#EF4444" : colors.border, color: colors.foreground }]}
            value={email} onChangeText={setEmail}
            placeholder="student@example.com" placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address" textAlign="right" autoCapitalize="none"
          />
          {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}
        </View>

        {authMode === "register" && role === "student" && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>الجامعة</Text>
            <TouchableOpacity style={[styles.input, styles.dropdownTrigger, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowUniDropdown(!showUniDropdown)}>
              <FeatherIcon name={showUniDropdown ? "chevron-up" : "chevron-down"} size={20} color={colors.mutedForeground} />
              <Text style={[styles.dropdownValue, { color: university ? colors.foreground : colors.mutedForeground }]}>{university || "اختر الجامعة"}</Text>
            </TouchableOpacity>
            {showUniDropdown && (
              <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {UNIVERSITIES.map((uni) => (
                    <TouchableOpacity key={uni} style={styles.dropdownItem} onPress={() => { setUniversity(uni); setShowUniDropdown(false); }}>
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
                {[
                  { hex: "white", label: "أبيض" }, { hex: "black", label: "أسود" },
                  { hex: "#C0C0C0", label: "فضي" }, { hex: "#DC2626", label: "أحمر" },
                  { hex: "#2563EB", label: "أزرق" },
                ].map((c) => (
                  <TouchableOpacity key={c.hex} style={[styles.colorCircle, { backgroundColor: c.hex === "white" ? "#F8F8F8" : c.hex === "black" ? "#111" : c.hex, borderColor: vehicleColor === c.label ? colors.primary : "transparent", borderWidth: 2 }]} onPress={() => setVehicleColor(c.label)} />
                ))}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>نوع السيارة</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} value={vehicleType} onChangeText={setVehicleType} placeholder="مثال: تويوتا كامري" placeholderTextColor={colors.mutedForeground} textAlign="right" />
            </View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>رقم اللوحة</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]} value={vehiclePlate} onChangeText={setVehiclePlate} placeholder="مثال: ب 1234 بغداد" placeholderTextColor={colors.mutedForeground} textAlign="right" />
            </View>
          </>
        )}

        <View style={[styles.whatsappNote, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30", marginBottom: 4 }]}>
          <FeatherIcon name="mail" size={14} color={colors.primary} />
          <Text style={[styles.whatsappNoteText, { color: colors.mutedForeground }]}>
            سيتم إرسال رمز تحقق عبر البريد الإلكتروني
          </Text>
        </View>

        <TouchableOpacity style={[styles.authBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]} onPress={handleSendOtp} disabled={loading} activeOpacity={0.85}>
          {loading ? <LoadingText /> : (
            <>
              <Text style={styles.authBtnText}>إرسال رمز التحقق</Text>
              <FeatherIcon name="send" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>أو</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity 
          style={[styles.authBtn, styles.googleBtn]} 
          onPress={handleGoogleSignIn} 
          disabled={loading} 
          activeOpacity={0.85}
        >
          <Text style={styles.googleBtnText}>المتابعة باستخدام Google</Text>
          <FontAwesome name="google" size={20} color="#DB4437" />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LoadingText({ label = "جارٍ التحقق" }: { label?: string }) {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const interval = setInterval(() => setDots((prev) => (prev.length >= 3 ? "" : prev + ".")), 400);
    return () => clearInterval(interval);
  }, []);
  return <Text style={styles.authBtnText}>{label}{dots}</Text>;
}

const styles = StyleSheet.create({
  welcomeContainer: { flex: 1, paddingHorizontal: 24 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  successTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  particle: { position: "absolute", width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff" },
  logoArea: { alignItems: "center", marginBottom: 30, zIndex: 1 },
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
  roleBadge: { position: "absolute", top: 12, right: 12, backgroundColor: "rgba(34,197,94,0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  roleBadgeText: { color: "#22C55E", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  roleIconBig: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", marginBottom: 16, alignSelf: "flex-end" },
  roleCardTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 8, textAlign: "right" },
  roleCardDesc: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", lineHeight: 22, textAlign: "right", marginBottom: 16 },
  roleArrow: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", alignSelf: "flex-end" },
  authContainer: { flex: 1 },
  authHeader: { paddingHorizontal: 20, paddingBottom: 24 },
  authHeaderContent: { alignItems: "flex-end" },
  authTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" },
  authSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.7)", textAlign: "right", marginTop: 6, lineHeight: 20 },
  roleTag: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5, marginBottom: 10 },
  roleTagText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  authForm: { flex: 1 },
  authFormContent: { padding: 20, gap: 16 },
  authToggle: { flexDirection: "row", backgroundColor: "#E8EDF5", borderRadius: 12, padding: 4, marginBottom: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  toggleBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10 },
  errorText: { color: "#DC2626", fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, textAlign: "right" },
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "right" },
  fieldError: { color: "#EF4444", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4, textAlign: "right" },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: "Inter_400Regular" },
  phoneInputContainer: { flexDirection: "row-reverse" as any, alignItems: "center", gap: 8 },
  phoneInput: { flex: 1 },
  phonePrefix: { backgroundColor: "#F1F5F9", paddingHorizontal: 12, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  phonePrefixText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#64748B" },
  dropdownTrigger: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dropdownValue: { fontSize: 15, fontFamily: "Inter_400Regular", flex: 1, textAlign: "right" },
  dropdownList: { borderRadius: 12, borderWidth: 1, marginTop: 4, overflow: "hidden" },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  dropdownItemText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "right" },
  colorPicker: { flexDirection: "row-reverse" as any, gap: 12, marginTop: 4 },
  colorCircle: { width: 36, height: 36, borderRadius: 18 },
  authBtn: { borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  authBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  otpIllustration: { alignItems: "center", gap: 12, paddingVertical: 8 },
  otpIconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  otpHint: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  devCodeBanner: { backgroundColor: "#FEF3C7", borderColor: "#F59E0B", borderWidth: 1.5, borderRadius: 14, padding: 16, alignItems: "center", gap: 6, marginBottom: 4 },
  devCodeTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  devCodeLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#92400E" },
  devCodeValue: { fontSize: 34, fontFamily: "Inter_700Bold", color: "#78350F", letterSpacing: 8 },
  devCodeSub: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#B45309" },
  otpRow: { flexDirection: "row", justifyContent: "center", gap: 10 },
  otpInput: { width: 46, height: 58, borderRadius: 14, fontSize: 24, fontFamily: "Inter_700Bold" },
  resendRow: { alignItems: "center", marginTop: 4 },
  resendHint: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  resendBtn: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center", paddingVertical: 8 },
  whatsappNote: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  whatsappNoteText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, textAlign: "right" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
  dividerText: { marginHorizontal: 12, fontSize: 13, fontFamily: "Inter_500Medium", color: "#64748B" },
  googleBtn: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", paddingVertical: 14 },
  googleBtnText: { color: "#334155", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
