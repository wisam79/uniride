import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";

function SkeletonBox({ width, height, borderRadius = 8, style }: {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: (width ?? "100%") as any,
          height,
          borderRadius,
          backgroundColor: "#DDE3EE",
          opacity,
        },
        style,
      ]}
    />
  );
}

export function DriverCardSkeleton() {
  return (
    <View style={styles.driverCard}>
      <View style={styles.driverHeader}>
        <SkeletonBox width={48} height={48} borderRadius={24} />
        <View style={styles.driverInfo}>
          <SkeletonBox height={14} width="60%" borderRadius={7} />
          <View style={{ height: 6 }} />
          <SkeletonBox height={11} width="40%" borderRadius={5} />
          <View style={{ height: 4 }} />
          <SkeletonBox height={10} width="30%" borderRadius={5} />
        </View>
        <SkeletonBox width={50} height={22} borderRadius={11} />
      </View>
      <View style={styles.statsRow}>
        <SkeletonBox width={60} height={36} borderRadius={8} />
        <SkeletonBox width={60} height={36} borderRadius={8} />
        <SkeletonBox width={60} height={36} borderRadius={8} />
      </View>
      <View style={styles.plansRow}>
        <SkeletonBox height={70} borderRadius={10} style={{ flex: 1 }} />
        <SkeletonBox height={70} borderRadius={10} style={{ flex: 1 }} />
        <SkeletonBox height={70} borderRadius={10} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

export function TripItemSkeleton() {
  return (
    <View style={styles.tripItem}>
      <SkeletonBox width={40} height={40} borderRadius={20} />
      <View style={styles.tripMain}>
        <SkeletonBox height={13} width="70%" borderRadius={6} />
        <View style={{ height: 6 }} />
        <SkeletonBox height={10} width="45%" borderRadius={5} />
      </View>
      <View style={styles.tripRight}>
        <SkeletonBox width={40} height={18} borderRadius={9} />
        <View style={{ height: 4 }} />
        <SkeletonBox width={28} height={10} borderRadius={5} />
      </View>
    </View>
  );
}

export function StatBoxSkeleton() {
  return (
    <View style={styles.statBoxRow}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.statBox}>
          <SkeletonBox width={28} height={28} borderRadius={14} />
          <View style={{ height: 8 }} />
          <SkeletonBox width={50} height={18} borderRadius={9} />
          <View style={{ height: 4 }} />
          <SkeletonBox width={36} height={10} borderRadius={5} />
        </View>
      ))}
    </View>
  );
}

export { SkeletonBox };

const styles = StyleSheet.create({
  driverCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDE3EE",
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
    gap: 12,
  },
  driverHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  driverInfo: {
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#DDE3EE",
    paddingVertical: 10,
  },
  plansRow: {
    flexDirection: "row",
    gap: 8,
  },
  tripItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDE3EE",
    padding: 14,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  tripMain: {
    flex: 1,
  },
  tripRight: {
    alignItems: "flex-end",
  },
  statBoxRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDE3EE",
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
});
