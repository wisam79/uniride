import FeatherIcon from "@/components/FeatherIcon";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface TripMapProps {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}

export function TripMap(_props: TripMapProps) {
  const colors = useColors();
  return (
    <View style={[styles.placeholder, { backgroundColor: colors.secondary }]}>
      <FeatherIcon name="map" size={32} color={colors.primary} />
      <Text style={[styles.text, { color: colors.mutedForeground }]}>
        الخريطة متاحة على الجهاز المحمول
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  text: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
