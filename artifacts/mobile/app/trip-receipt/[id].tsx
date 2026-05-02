import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import FeatherIcon from "@/components/FeatherIcon";
import RatingModal from "@/components/RatingModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TripReceiptScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tripHistory, user, refreshHistory } = useApp();
  const [showRating, setShowRating] = React.useState(false);

  const trip = useMemo(() => 
    tripHistory.find((t) => t.id === id),
  [tripHistory, id]);

  if (!trip) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: colors.foreground }}>الرحلة غير موجودة</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary }}>العودة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const date = new Date(trip.startTime);
  const arabicDays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const arabicMonths = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  
  const dateStr = `${arabicDays[date.getDay()]}، ${date.getDate()} ${arabicMonths[date.getMonth()]}`;
  const timeStr = date.toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" });

  const originAddr = trip.origin?.address ?? trip.originAddress;
  const destAddr = trip.destination?.address ?? trip.destAddress;

  const handleShare = () => {
    const message = `إيصال رحلة يونيرايد\nالتاريخ: ${dateStr}\nمن: ${originAddr}\nإلى: ${destAddr}\nالأجرة: ${(Number(trip.fare) / 1000).toFixed(0)}k د.ع`;
    Share.share({ message });
  };

  const topPad = insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#0D2847", "#1A3C6E"]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <FeatherIcon name="arrow-right" size={24} color="#fff" style={{ transform: [{ scaleX: -1 }] }} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>إيصال الرحلة</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.receiptCard, { backgroundColor: colors.card }]}>
          <View style={styles.brandSection}>
            <Text style={[styles.brandName, { color: colors.primary }]}>يونيرايد</Text>
            <View style={[styles.officialBadge, { backgroundColor: colors.success + "15" }]}>
              <Text style={[styles.officialText, { color: colors.success }]}>رحلة رسمية</Text>
            </View>
          </View>

          <View style={[styles.dashedDivider, { borderColor: colors.border }]} />

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>التاريخ</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{dateStr}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>الوقت</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{timeStr}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>السائق</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{trip.driverName || "—"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>التقييم</Text>
              <Text style={[styles.infoValue, { color: "#FFD700" }]}>
                {trip.driverRating ? "★".repeat(Number(trip.driverRating)) : "لم يتم التقييم"}
              </Text>
            </View>
          </View>

          <View style={styles.routeSection}>
            <View style={styles.timeline}>
              <View style={[styles.timelineDot, { backgroundColor: colors.success }]} />
              <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
              <View style={[styles.timelineDot, { backgroundColor: colors.accent }]} />
            </View>
            <View style={styles.routeDetails}>
              <View style={styles.routeItem}>
                <Text style={[styles.routeLabel, { color: colors.mutedForeground }]}>من</Text>
                <Text style={[styles.routeText, { color: colors.foreground }]} numberOfLines={1}>{originAddr}</Text>
              </View>
              <View style={styles.routeItem}>
                <Text style={[styles.routeLabel, { color: colors.mutedForeground }]}>إلى</Text>
                <Text style={[styles.routeText, { color: colors.foreground }]} numberOfLines={1}>{destAddr}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.dashedDivider, { borderColor: colors.border }]} />

          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>الأجرة الإجمالية</Text>
              <Text style={[styles.priceValue, { color: colors.foreground }]}>{(Number(trip.fare) / 1000).toFixed(0)}k د.ع</Text>
            </View>
            {user?.role === "driver" && (
              <>
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>حصة السائق (85%)</Text>
                  <Text style={[styles.priceValue, { color: colors.success }]}>{(Number(trip.driverShare) / 1000).toFixed(0)}k د.ع</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>عمولة التطبيق (15%)</Text>
                  <Text style={[styles.priceValue, { color: colors.destructive }]}>{( (Number(trip.fare) - Number(trip.driverShare)) / 1000).toFixed(0)}k د.ع</Text>
                </View>
              </>
            )}
          </View>

          <View style={[styles.statusBadge, { backgroundColor: colors.success + "15" }]}>
            <Text style={[styles.statusText, { color: colors.success }]}>مكتملة</Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleShare}>
          <FeatherIcon name="share-2" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>شارك الإيصال</Text>
        </TouchableOpacity>

        {user?.role === "student" && !trip.driverRating && (
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.success, marginTop: 12 }]} 
            onPress={() => setShowRating(true)}
          >
            <FeatherIcon name="star" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>تقييم الرحلة</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <RatingModal
        visible={showRating}
        onClose={() => setShowRating(false)}
        tripId={trip.id}
        driverName={trip.driverName ?? ""}
        onSubmitted={() => {
          refreshHistory();
          setShowRating(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 25 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, paddingBottom: 40 },
  receiptCard: {
    borderRadius: 24,
    padding: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    marginBottom: 24,
  },
  brandSection: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brandName: { fontSize: 22, fontFamily: "Inter_800ExtraBold" },
  officialBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  officialText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  dashedDivider: { borderBottomWidth: 1, borderStyle: "dashed", marginVertical: 20 },
  infoSection: { gap: 12 },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  infoLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  routeSection: { flexDirection: "row", marginTop: 20, gap: 16 },
  timeline: { alignItems: "center", width: 12, paddingVertical: 4 },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineLine: { width: 1, flex: 1, marginVertical: 4 },
  routeDetails: { flex: 1, gap: 16 },
  routeItem: {},
  routeLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 2 },
  routeText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  priceSection: { gap: 12 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  priceValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statusBadge: { alignSelf: "center", marginTop: 24, paddingHorizontal: 24, paddingVertical: 8, borderRadius: 20 },
  statusText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  actionBtn: { height: 56, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  actionBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
