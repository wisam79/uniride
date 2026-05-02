import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

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
  const [today] = useState(new Date().getDay());
  const ARABIC_DAYS = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

  const max = maxAmount ?? Math.max(...data.map((d) => d.amount), 1);
  const hasData = data.some((d) => d.amount > 0);

  const barAnims = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = barAnims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 600,
        delay: i * 60,
        useNativeDriver: false,
      })
    );
    Animated.stagger(60, animations).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.titleRow}>
        <FeatherIcon name="bar-chart-2" size={16} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground }]}>أرباح الأسبوع</Text>
        <Text style={[styles.total, { color: colors.mutedForeground }]}>
          {(data.reduce((s, d) => s + d.amount, 0) / 1000).toFixed(0)}k د.ع
        </Text>
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
            const isToday = ARABIC_DAYS[today] === item.day;
            const barColor = isToday ? colors.accent : colors.primary;

            const barHeight = barAnims[idx].interpolate({
              inputRange: [0, 1],
              outputRange: [0, Math.max(ratio * CHART_HEIGHT, ratio > 0 ? 4 : 0)],
            });

            return (
              <View key={idx} style={styles.barWrapper}>
                {item.amount > 0 && (
                  <Text style={[styles.amount, { color: isToday ? colors.accent : colors.mutedForeground }]}>
                    {(item.amount / 1000).toFixed(0)}k
                  </Text>
                )}
                <View style={styles.barTrack}>
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
                </View>
                <Text style={[styles.dayLabel, { color: isToday ? colors.accent : colors.mutedForeground, fontFamily: isToday ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                  {item.day.charAt(0)}{item.day.charAt(1)}
                </Text>
              </View>
            );
          })}
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
    marginBottom: 16,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  total: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: CHART_HEIGHT + 40,
    gap: 6,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barTrack: {
    width: "100%",
    height: CHART_HEIGHT,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  bar: {
    width: "80%",
    borderRadius: 4,
    minHeight: 0,
  },
  dayLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: "center",
  },
  amount: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
    textAlign: "center",
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
