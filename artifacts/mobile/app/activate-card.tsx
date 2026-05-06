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
import { useAuth, useSubscription } from "@/context";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";

const CARD_CHARS = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

export default function ActivateCardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { } = useSubscription();

  const [segments, setSegments] = useState(["", "", ""]);
  const [validating, setValidating] = useState(false);
  const [activating, setActivating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const input1 = useRef<TextInput>(null);
  const input2 = useRef<TextInput>(null);
  const input3 = useRef<TextInput>(null);
  const refs = [input1, input2, input3];

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const fullCode = segments.join("-");
  const isComplete = segments.every((s) => s.length === 4);

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
    setErrorMsg("");

    if (filtered.length === 4 && index < 2) {
      refs[index + 1]?.current?.focus();
    }
  };

  const handleBackspace = (key: string, index: number) => {
    if (key === "Backspace" && segments[index] === "" && index > 0) {
      refs[index - 1]?.current?.focus();
    }
  };

  const handleActivate = async () => {
    if (!isComplete) return;

    const rawCode = segments.join("").toUpperCase();
    setActivating(true);
    setErrorMsg("");

    try {
      const { data: card, error: cardError } = await supabase
        .from("cards")
        .select("*")
        .eq("code", rawCode)
        .single();

      if (cardError || !card) {
        setErrorMsg("كود غير صالح");
        shake();
        setActivating(false);
        return;
      }

      if (card.is_used) {
        setErrorMsg("هذا الكود مستخدم مسبقاً");
        shake();
        setActivating(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        setErrorMsg("يجب تسجيل الدخول أولاً");
        shake();
        setActivating(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("cards")
        .update({ is_used: true, used_by: userId, used_at: new Date().toISOString() })
        .eq("id", card.id);

      if (updateError) {
        setErrorMsg("فشل تفعيل البطاقة، حاول مرة أخرى");
        shake();
        setActivating(false);
        return;
      }

      const { error: subError } = await supabase.from("subscriptions").insert({
        student_id: userId,
        driver_id: card.driver_id,
        monthly_fee: card.monthly_fee,
        status: "active",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });

      if (subError) {
        setErrorMsg("تم تفعيل البطاقة لكن فشل إنشاء الاشتراك");
        shake();
        setActivating(false);
        return;
      }

      Animated.spring(successAnim, { toValue: 1, useNativeDriver: true, damping: 8 }).start();
      setSuccess(true);
      Alert.alert("نجاح", "تم تفعيل الاشتراك بنجاح!");
      setTimeout(() => router.replace("/(tabs)/subscription"), 2500);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "فشل تفعيل البطاقة");
      shake();
    } finally {
      setActivating(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.successScreen, { backgroundColor: colors.background }]}>
        <Animated.View style={[styles.successContent, { transform: [{ scale: successAnim }] }]}>
          <View style={[styles.successCircle, { backgroundColor: "#22C55E" }]}>
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
          <LinearGradient colors={["#1A3C6E", "#0D2847"]} style={styles.cardGradient}>
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
                      borderColor: errorMsg ? "#EF4444" : seg.length === 4 ? colors.primary : colors.border,
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

          {errorMsg !== "" && (
            <View style={[styles.errorCard, { backgroundColor: "#EF444415", borderColor: "#EF444440" }]}>
              <FeatherIcon name="x-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}
        </View>

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
        <TouchableOpacity
          style={[
            styles.activateBtn,
            {
              backgroundColor: isComplete ? colors.accent : colors.border,
              opacity: isComplete && !activating ? 1 : 0.6,
            },
          ]}
          onPress={handleActivate}
          disabled={!isComplete || activating}
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
  codeInput: { flex: 1, height: 56, borderRadius: 12, borderWidth: 2, fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: 4 },
  dash: { fontSize: 24, fontFamily: "Inter_700Bold" },
  errorCard: { marginTop: 12, borderRadius: 12, borderWidth: 1, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  errorText: { fontSize: 13, color: "#EF4444", flex: 1, textAlign: "right" },
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
