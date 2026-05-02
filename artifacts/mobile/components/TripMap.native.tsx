import React from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";

interface TripMapProps {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}

export function TripMap({ originLat, originLng, destLat, destLng }: TripMapProps) {
  return (
    <MapView
      style={styles.map}
      provider={PROVIDER_DEFAULT}
      initialRegion={{
        latitude: (originLat + destLat) / 2,
        longitude: (originLng + destLng) / 2,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      }}
    >
      <Marker
        coordinate={{ latitude: originLat, longitude: originLng }}
        title="نقطة الانطلاق"
        pinColor="#22C55E"
      />
      <Marker
        coordinate={{ latitude: destLat, longitude: destLng }}
        title="الجامعة"
        pinColor="#FF6B35"
      />
      <Polyline
        coordinates={[
          { latitude: originLat, longitude: originLng },
          { latitude: destLat, longitude: destLng },
        ]}
        strokeColor="#1A3C6E"
        strokeWidth={3}
        lineDashPattern={[8, 4]}
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 220,
    width: "100%",
  },
});
