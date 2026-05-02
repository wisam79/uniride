import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import FeatherIcon from "@/components/FeatherIcon";
import { useColors } from "@/hooks/useColors";

interface DayData {
  day: string;
  amount: number;
}

interface EarningsChartProps {
  data: DayData[];
  maxAmount?: number;
}

const CHART_HEIGHT = 100;

export function EarningsChart({ data, maxAmount }: EarningsChartProps) {
  const colors = useColors();
  const [todayIdx] = useState(new Date().getDay());
  const ARABIC_DAYS = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const max = maxAmount ?? Math.max(...data.map((d) => d.amount), 1);
  const hasData = data.some((d) => d.amount > 0);

  const barAnims = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = barAnims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 800,
        delay: i * 80,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: false,
      })
    );
    Animated.stagger(80, animations).start();
  }, []);

  const handleBarPress = (idx: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSelectedBar(idx);
    Animated.spring(tooltipAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();

    timeoutRef.current = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Animated.timing(tooltipAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setSelectedBar(null));
    }, 2000);
  };

  const totalAmount = data.reduce((s, d) => s + d.amount, 0);
  const averageAmount = data.length > 0 ? totalAmount / data.length : 0;

  // Trend calculation (today vs yesterday)
  const todayAmount = data[data.length - 1]?.amount || 0;
  const yesterdayAmount = data[data.length - 2]?.amount || 0;
  let trendPercent = 0;
  let trendDir: "up" | "down" | "flat" = "flat";
  if (yesterdayAmount > 0) {
    trendPercent = Math.round(((todayAmount - yesterdayAmount) / yesterdayAmount) * 100);
    trendDir = trendPercent > 0 ? "up" : trendPercent < 0 ? "down" : "flat";
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.titleRow}>
        <FeatherIcon name="bar-chart-2" size={16} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground }]}>أرباح الأسبوع</Text>
        {trendDir !== "flat" && (
          <View style={styles.trendContainer}>
            <FeatherIcon
              name={trendDir === "up" ? "trending-up" : "trending-down"}
              size={12}
              color={trendDir === "up" ? "#22C55E" : "#EF4444"}
            />
            <Text style={[styles.trendText, { color: trendDir === "up" ? "#22C55E" : "#EF4444" }]}>
              {Math.abs(trendPercent)}% من أمس
            </Text>
          </View>
        )}
      </View>

      {!hasData ? (
        <View style={styles.emptyState}>
          <FeatherIcon name="trending-up" size={28} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا توجد أرباح بعد</Text>
        </View>
      ) : (
        <View style={styles.chart}>
          {data.map((item, idx) => {
            const ratio = max > 0 ? item.amount / max : 0;
            const isToday = ARABIC_DAYS[todayIdx] === item.day;
            const barColor = isToday ? colors.accent : colors.primary;

            const barHeight = barAnims[idx].interpolate({
              inputRange: [0, 1],
              outputRange: [0, Math.max(ratio * CHART_HEIGHT, ratio > 0 ? 4 : 0)],
            });

            return (
              <View key={idx} style={styles.barWrapper}>
                {selectedBar === idx && (
                  <Animated.View
                    style={[
                      styles.tooltip,
                      {
                        backgroundColor: colors.foreground,
                        opacity: tooltipAnim,
                        transform: [{ translateY: tooltipAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
                      },
                    ]}
                  >
                    <Text style={[styles.tooltipText, { color: colors.background }]}>
                      {item.day}: {(item.amount / 1000).toFixed(0)}k د.ع
                    </Text>
                  </Animated.View>
                )}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleBarPress(idx)}
                  style={styles.barTrack}
                >
                  <Animated.View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: barColor,
                        opacity: isToday ? 1 : 0.7,
                      },
                    ]}
                  />
                </TouchableOpacity>
                <Text
                  style={[
                    styles.dayLabel,
                    {
                      color: isToday ? colors.accent : colors.mutedForeground,
                      fontFamily: isToday ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {item.day.charAt(0)}
                  {item.day.charAt(1)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {hasData && (
        <View style={styles.footerStats}>
          <View style={[styles.statBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>المجموع</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {(totalAmount / 1000).toFixed(0)}k د.ع
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>المتوسط اليومي</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {(averageAmount / 1000).toFixed(0)}k د.ع
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: CHART_HEIGHT + 40,
    gap: 8,
    marginBottom: 16,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    position: "relative",
  },
  barTrack: {
    width: "100%",
    height: CHART_HEIGHT,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  bar: {
    width: "70%",
    borderRadius: 6,
    minHeight: 0,
  },
  dayLabel: {
    fontSize: 10,
    marginTop: 6,
    textAlign: "center",
  },
  tooltip: {
    position: "absolute",
    top: -35,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 10,
    minWidth: 80,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tooltipText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  footerStats: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  statBox: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
