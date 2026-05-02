import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import FeatherIcon from "@/components/FeatherIcon";

interface PriceBreakdownProps {
  fare: number;
  label?: string;
}

export default function PriceBreakdown({ fare, label }: PriceBreakdownProps) {
  const colors = useColors();

  const driverShare = Math.round(fare * 0.85);
  const appCommission = fare - driverShare;

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ar-IQ") + " د.ع";
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: 14,
        },
      ]}
    >
      <View style={styles.header}>
        <FeatherIcon name="dollar-sign" size={18} color={colors.primary} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {label || "تفاصيل السعر"}
        </Text>
      </View>

      <View style={styles.totalRow}>
        <Text style={[styles.totalAmount, { color: colors.text }]}>
          {formatCurrency(fare)}
        </Text>
      </View>

      <View style={[styles.progressContainer, { backgroundColor: colors.muted }]}>
        <View
          style={[
            styles.progressBar,
            {
              width: "85%",
              backgroundColor: colors.primary,
              borderTopLeftRadius: 6,
              borderBottomLeftRadius: 6,
            },
          ]}
        />
        <View
          style={[
            styles.progressBar,
            {
              width: "15%",
              backgroundColor: colors.accent,
              borderTopRightRadius: 6,
              borderBottomRightRadius: 6,
            },
          ]}
        />
      </View>

      <View style={styles.breakdownContainer}>
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLabelGroup}>
            <View
              style={[styles.dot, { backgroundColor: colors.success }]}
            />
            <Text style={[styles.breakdownLabel, { color: colors.mutedForeground }]}>
              حصة السائق: 85%
            </Text>
          </View>
          <Text style={[styles.breakdownValue, { color: colors.success }]}>
            {formatCurrency(driverShare)}
          </Text>
        </View>

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLabelGroup}>
            <View
              style={[styles.dot, { backgroundColor: colors.accent }]}
            />
            <Text style={[styles.breakdownLabel, { color: colors.mutedForeground }]}>
              عمولة التطبيق: 15%
            </Text>
          </View>
          <Text style={[styles.breakdownValue, { color: colors.accent }]}>
            {formatCurrency(appCommission)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderWidth: 1,
    width: "100%",
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  totalRow: {
    alignItems: "center",
    marginBottom: 16,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  progressContainer: {
    height: 12,
    borderRadius: 6,
    flexDirection: "row-reverse",
    overflow: "hidden",
    marginBottom: 16,
  },
  progressBar: {
    height: "100%",
  },
  breakdownContainer: {
    gap: 8,
  },
  breakdownRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownLabelGroup: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
});
