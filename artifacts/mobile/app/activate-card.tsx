import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import FeatherIcon from "@/components/FeatherIcon";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";

const CARD_CHARS = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

type ValidationState = "idle" | "validating" | "valid" | "invalid";

export default function ActivateCardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { availableDrivers, refreshUser, notify } = useApp();

  const [segments, setSegments] = useState(["", "", ""]);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationState>("idle");
  const [validInfo, setValidInfo] = useState<{ plan: string; planName: string; durationMonths: number; driverId?: string } | null>(null);
  const [activating, setActivating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const input1 = useRef<TextInput>(null);
  const input2 = useRef<TextInput>(null);
  const input3 = useRef<TextInput>(null);
  const refs = [input1, input2, input3];

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const fullCode = segments.join("-");
  const isComplete = segments.every(s => s.length === 4);

  const shake = useCallback(() => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleSegmentChange = (text: string, index: number) => {
    const filtered = text.toUpperCase().replace(new RegExp(`[^${CARD_CHARS}]`, "g"), "");
    const newSegments = [...segments];
    newSegments[index] = filtered;
    setSegments(newSegments);
    setValidation("idle");
    setValidInfo(null);
    setErrorMsg("");

    if (filtered.length === 4 && index < 2) {
      refs[index + 1]?.current?.focus();
    }

    if (newSegments.every(s => s.length === 4)) {
      setTimeout(() => validateCode(newSegments.join("-")), 300);
    }
  };

  const handleBackspace = (key: string, index: number) => {
    if (key === "Backspace" && segments[index] === "" && index > 0) {
      refs[index - 1]?.current?.focus();
    }
  };

  const validateCode = async (code: string) => {
    setValidation("validating");
    try {
      const data = await api.get<{ plan: string; planName: string; durationMonths: number; driverId?: string }>(`/cards/validate/${code.replace(/-/g, "")}`);
      setValidInfo(data);
      setValidation("valid");
      if (data.driverId) setSelectedDriver(data.driverId);
    } catch (err: any) {
      setValidation("invalid");
      setErrorMsg(err?.response?.data?.error ?? "الرمز غير صحيح");
      shake();
    }
  };

  const handleActivate = async () => {
    if (!isComplete || validation !== "valid") return;
    if (!selectedDriver && !validInfo?.driverId) {
      Alert.alert("اختر سائقاً", "يرجى اختيار السائق الذي تريد الاشتراك معه");
      return;
    }

    setActivating(true);
    try {
      const data = await api.post<{ plan: string; driverName: string }>("/cards/activate", {
        code: fullCode,
        driverId: selectedDriver ?? validInfo?.driverId,
      });

      Animated.spring(successAnim, { toValue: 1, useNativeDriver: true, damping: 8 }).start();
      setSuccess(true);
      await refreshUser();
      notify(`تم تفعيل الاشتراك ${data.plan} مع ${data.driverName} بنجاح!`, "success");

      setTimeout(() => router.replace("/(tabs)/subscription"), 2500);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error ?? "فشل تفعيل البطاقة");
      setValidation("invalid");
      shake();
    } finally {
      setActivating(false);
    }
  };

  const planColors: Record<string, string> = {
    basic: "#4A90D9",
    standard: "#1A3C6E",
    premium: "#FF6B35",
  };

  const planIcons: Record<string, string> = {
    basic: "package",
    standard: "star",
    premium: "award",
  };

  if (success) {
    return (
      <View style={[styles.successScreen, { backgroundColor: colors.background }]}>
        <Animated.View style={[styles.successContent, { transform: [{ scale: successAnim }] }]}>
          <View style={[styles.successCircle, { backgroundColor: colors.success }]}>
            <FeatherIcon name="check" size={56} color="#fff" />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>تم التفعيل!</Text>
          <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
            اشتراكك بدأ الآن، استمتع برحلاتك
          </Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={["#0D2847", "#1A3C6E"]} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <FeatherIcon name="arrow-right" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تفعيل بطاقة الاشتراك</Text>
        <Text style={styles.headerSub}>أدخل رمز البطاقة لتفعيل اشتراكك</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.cardIllustration, { backgroundColor: colors.primary }]}>
          <LinearGradient
            colors={["#1A3C6E", "#0D2847"]}
            style={styles.cardGradient}
          >
            <View style={styles.cardChip}>
              <FeatherIcon name="credit-card" size={20} color="#FFD700" />
            </View>
            <Text style={styles.cardBrand}>يونيرايد</Text>
            <Text style={styles.cardSubBrand}>UniRide Iraq — بطاقة الاشتراك</Text>
            <View style={styles.cardCodeDisplay}>
              {segments.map((seg, i) => (
                <React.Fragment key={i}>
                  <Text style={[styles.cardCodeSegment, { color: seg.length === 4 ? "#FFD700" : "rgba(255,255,255,0.3)" }]}>
                    {seg.padEnd(4, "•")}
                  </Text>
                  {i < 2 && <Text style={styles.cardCodeDash}>-</Text>}
                </React.Fragment>
              ))}
            </View>
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>رمز البطاقة</Text>
          <Animated.View style={[styles.inputsRow, { transform: [{ translateX: shakeAnim }] }]}>
            {segments.map((seg, i) => (
              <React.Fragment key={i}>
                <TextInput
                  ref={refs[i]}
                  style={[
                    styles.codeInput,
                    {
                      backgroundColor: colors.card,
                      borderColor: validation === "valid" ? colors.success
                        : validation === "invalid" ? "#EF4444"
                        : seg.length === 4 ? colors.primary
                        : colors.border,
                      color: colors.foreground,
                    },
                  ]}
                  value={seg}
                  onChangeText={(t) => handleSegmentChange(t, i)}
                  onKeyPress={({ nativeEvent }) => handleBackspace(nativeEvent.key, i)}
                  maxLength={4}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder="XXXX"
                  placeholderTextColor={colors.mutedForeground}
                  textAlign="center"
                />
                {i < 2 && <Text style={[styles.dash, { color: colors.mutedForeground }]}>-</Text>}
              </React.Fragment>
            ))}
          </Animated.View>

          {validation === "validating" && (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.statusText, { color: colors.mutedForeground }]}>جاري التحقق من الرمز...</Text>
            </View>
          )}

          {validation === "valid" && validInfo && (
            <View style={[styles.validCard, { backgroundColor: colors.success + "15", borderColor: colors.success + "40" }]}>
              <View style={styles.validRow}>
                <View style={[styles.planIcon, { backgroundColor: planColors[validInfo.plan] }]}>
                  <FeatherIcon name={planIcons[validInfo.plan] as any} size={18} color="#fff" />
                </View>
                <View style={styles.validInfo}>
                  <Text style={[styles.validTitle, { color: colors.success }]}>✓ بطاقة صالحة</Text>
                  <Text style={[styles.validSub, { color: colors.foreground }]}>
                    خطة {validInfo.planName} — {validInfo.durationMonths} شهر
                  </Text>
                </View>
              </View>
            </View>
          )}

          {validation === "invalid" && errorMsg !== "" && (
            <View style={[styles.errorCard, { backgroundColor: "#EF444415", borderColor: "#EF444440" }]}>
              <FeatherIcon name="x-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}
        </View>

        {validation === "valid" && !validInfo?.driverId && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>اختر السائق</Text>
            {availableDrivers.length === 0 ? (
              <View style={[styles.emptyDrivers, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <FeatherIcon name="users" size={24} color={colors.mutedForeground} />
                <Text style={[styles.emptyDriversText, { color: colors.mutedForeground }]}>لا يوجد سائقون متاحون حالياً</Text>
              </View>
            ) : (
              availableDrivers.map((driver) => (
                <TouchableOpacity
                  key={driver.id}
                  style={[
                    styles.driverOption,
                    {
                      backgroundColor: colors.card,
                      borderColor: selectedDriver === driver.id ? colors.primary : colors.border,
                      borderWidth: selectedDriver === driver.id ? 2 : 1,
                    },
                  ]}
                  onPress={() => setSelectedDriver(driver.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.driverAvatar, { backgroundColor: colors.primary + "20" }]}>
                    <FeatherIcon name="user" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.driverInfo}>
                    <Text style={[styles.driverName, { color: colors.foreground }]}>{driver.name}</Text>
                    <Text style={[styles.driverSub, { color: colors.mutedForeground }]}>
                      ⭐ {Number(driver.rating).toFixed(1)} · {driver.totalTrips} رحلة
                    </Text>
                  </View>
                  {selectedDriver === driver.id && (
                    <FeatherIcon name="check-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        <View style={styles.howSection}>
          <Text style={[styles.howTitle, { color: colors.foreground }]}>كيف تعمل البطاقة؟</Text>
          {[
            { icon: "shopping-bag", text: "اشترِ بطاقة الاشتراك من موزع معتمد" },
            { icon: "type", text: "أدخل الرمز السري المكوّن من 12 خانة" },
            { icon: "check-circle", text: "يُفعَّل اشتراكك فوراً ولا يمكن إعادة استخدامه" },
            { icon: "shield", text: "الرمز مرتبط بحسابك بشكل دائم وآمن" },
          ].map((item, i) => (
            <View key={i} style={styles.howRow}>
              <View style={[styles.howIcon, { backgroundColor: colors.primary + "15" }]}>
                <FeatherIcon name={item.icon as any} size={16} color={colors.primary} />
              </View>
              <Text style={[styles.howText, { color: colors.mutedForeground }]}>{item.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }], flex: 1 }}>
          <TouchableOpacity
            style={[
              styles.activateBtn,
              {
                backgroundColor: validation === "valid" ? colors.accent : colors.border,
                opacity: isComplete && validation === "valid" && !activating ? 1 : 0.6,
              },
            ]}
            onPress={handleActivate}
            disabled={!isComplete || validation !== "valid" || activating}
            activeOpacity={0.85}
          >
            {activating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <FeatherIcon name="zap" size={20} color="#fff" />
                <Text style={styles.activateBtnText}>تفعيل الاشتراك</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  backBtn: { marginBottom: 12, alignSelf: "flex-end" },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "right" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.7)", textAlign: "right", marginTop: 4 },
  cardIllustration: { borderRadius: 16, overflow: "hidden", marginBottom: 28, elevation: 6, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  cardGradient: { padding: 24, minHeight: 160 },
  cardChip: { marginBottom: 12 },
  cardBrand: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "right" },
  cardSubBrand: { fontSize: 11, color: "rgba(255,255,255,0.5)", textAlign: "right", marginBottom: 20 },
  cardCodeDisplay: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
  cardCodeSegment: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: 4 },
  cardCodeDash: { fontSize: 20, color: "rgba(255,255,255,0.3)", marginHorizontal: 4 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 10, textAlign: "right" },
  inputsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  codeInput: { flex: 1, height: 56, borderRadius: 12, borderWidth: 2, fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: 4, textTransform: "uppercase" },
  dash: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, justifyContent: "center" },
  statusText: { fontSize: 13 },
  validCard: { marginTop: 12, borderRadius: 12, borderWidth: 1, padding: 14 },
  validRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  planIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  validInfo: { flex: 1 },
  validTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  validSub: { fontSize: 13, marginTop: 2 },
  errorCard: { marginTop: 12, borderRadius: 12, borderWidth: 1, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  errorText: { fontSize: 13, color: "#EF4444", flex: 1, textAlign: "right" },
  emptyDrivers: { borderRadius: 12, borderWidth: 1, padding: 20, alignItems: "center", gap: 8 },
  emptyDriversText: { fontSize: 13 },
  driverOption: { borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  driverSub: { fontSize: 12, marginTop: 2, textAlign: "right" },
  howSection: { backgroundColor: "transparent" },
  howTitle: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "right", marginBottom: 12 },
  howRow: { flexDirection: "row-reverse" as any, alignItems: "center", gap: 12, marginBottom: 10 },
  howIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  howText: { fontSize: 13, flex: 1, textAlign: "right" },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1 },
  activateBtn: { borderRadius: 16, height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  activateBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
  successScreen: { flex: 1, alignItems: "center", justifyContent: "center" },
  successContent: { alignItems: "center", gap: 16 },
  successCircle: { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  successSub: { fontSize: 15, textAlign: "center" },
});
