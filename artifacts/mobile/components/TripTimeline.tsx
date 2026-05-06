import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { TripData } from "@/context";
import { useColors } from "@/hooks/useColors";
import FeatherIcon from "@/components/FeatherIcon";

interface TripTimelineProps {
  trip: TripData;
}

export default function TripTimeline({ trip }: TripTimelineProps) {
  const colors = useColors();

  const isCompleted = trip.status === "completed";
  const startTime = new Date(trip.started_at ?? trip.trip_date).toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const startDate = new Date(trip.trip_date).toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const endTime = trip.ended_at
    ? new Date(trip.ended_at).toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const formatFare = (fare: string) => {
    const amount = Number(fare);
    return amount.toLocaleString("ar-IQ") + " د.ع";
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Driver Info */}
      <View style={styles.driverInfo}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "15" }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>س</Text>
        </View>
        <View style={styles.driverDetails}>
          <Text style={[styles.driverName, { color: colors.text }]}>السائق</Text>
          <Text style={[styles.driverVehicle, { color: colors.muted }]}>سيارة</Text>
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        {/* Origin */}
        <View style={styles.timelineItem}>
          <View style={styles.leftColumn}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <View style={[styles.line, { backgroundColor: colors.border }]} />
          </View>
          <View style={styles.rightColumn}>
            <View style={styles.entryHeader}>
              <Text style={[styles.entryTitle, { color: colors.text }]}>انطلاق</Text>
              <Text style={[styles.entryTime, { color: colors.muted }]}>{startTime}</Text>
            </View>
            <Text style={[styles.entryAddress, { color: colors.muted }]} numberOfLines={2}>
              موقع الانطلاق
            </Text>
            <Text style={[styles.entryDate, { color: colors.muted }]}>{startDate}</Text>
          </View>
        </View>

        {/* Destination */}
        <View style={[styles.timelineItem, { marginBottom: 0 }]}>
          <View style={styles.leftColumn}>
            <View
              style={[
                styles.dot,
                { backgroundColor: isCompleted ? colors.warning : colors.border },
              ]}
            />
          </View>
          <View style={styles.rightColumn}>
            <View style={styles.entryHeader}>
              <Text style={[styles.entryTitle, { color: colors.text }]}>وصول</Text>
              {endTime && <Text style={[styles.entryTime, { color: colors.muted }]}>{endTime}</Text>}
            </View>
            <Text style={[styles.entryAddress, { color: colors.muted }]} numberOfLines={2}>
              الوجهة
            </Text>
          </View>
        </View>
      </View>

      {/* Fare */}
      {isCompleted && (
        <View style={[styles.fareRow, { borderTopColor: colors.border }]}>
          <View style={styles.fareLabelRow}>
            <FeatherIcon name="check-circle" size={16} color={colors.success} />
            <Text style={[styles.fareLabel, { color: colors.text }]}>تمت الرحلة بنجاح</Text>
          </View>
          <Text style={[styles.fareAmount, { color: colors.success }]}>
            {formatFare("0")}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  driverInfo: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
  },
  driverDetails: {
    flex: 1,
    alignItems: "flex-end",
  },
  driverName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  driverVehicle: {
    fontSize: 13,
  },
  ratingBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    marginRight: 4,
    color: "#FFD700",
  },
  timeline: {
    paddingHorizontal: 8,
  },
  timelineItem: {
    flexDirection: "row-reverse",
    marginBottom: 8,
  },
  leftColumn: {
    alignItems: "center",
    width: 20,
    marginLeft: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 1,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: -2,
    marginBottom: -2,
  },
  rightColumn: {
    flex: 1,
    alignItems: "flex-end",
    paddingBottom: 16,
  },
  entryHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 4,
  },
  entryTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  entryTime: {
    fontSize: 13,
  },
  entryAddress: {
    fontSize: 14,
    textAlign: "right",
    marginBottom: 4,
  },
  entryDate: {
    fontSize: 12,
  },
  fareRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  fareLabelRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
  },
  fareLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  fareAmount: {
    fontSize: 18,
    fontWeight: "700",
  },
});
