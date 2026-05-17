import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Route } from '@uniride/core';
import { Colors, Spacing, BorderRadius, Shadow, FontFamily } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../hooks/useTranslation';
import { useRouter } from 'expo-router';

interface RouteCardProps {
  item: Route;
}

export const RouteCard: React.FC<RouteCardProps> = ({ item }) => {
  const { t, isRTL } = useTranslation();
  const router = useRouter();

  return (
    <TouchableOpacity
      style={[styles.card, isRTL && styles.cardRTL]}
      onPress={() => router.push({ pathname: '/booking', params: { routeId: item.id } })}
      activeOpacity={0.85}
    >
      {/* Orange accent bar */}
      <View style={styles.cardAccent} />

      <View style={styles.cardContent}>
        {/* Route Name */}
        <Text style={[styles.routeName, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
          {item.title}
        </Text>

        {/* From → To */}
        <View style={styles.routePath}>
          <View style={[styles.routeStop, isRTL && { flexDirection: 'row-reverse' }]}>
            <Ionicons name="radio-button-on" size={12} color={Colors.primary} />
            <Text
              style={[styles.routeStopText, { textAlign: isRTL ? 'right' : 'left' }]}
              numberOfLines={1}
            >
              {item.start_location}
            </Text>
          </View>
          <View style={[styles.routeLine, { alignSelf: isRTL ? 'flex-end' : 'flex-start', marginHorizontal: 5 }]} />
          <View style={[styles.routeStop, isRTL && { flexDirection: 'row-reverse' }]}>
            <Ionicons name="location" size={12} color={Colors.secondary} />
            <Text
              style={[styles.routeStopText, { textAlign: isRTL ? 'right' : 'left' }]}
              numberOfLines={1}
            >
              {item.end_location}
            </Text>
          </View>
        </View>

        {/* Schedule */}
        <View style={[styles.scheduleRow, isRTL && { flexDirection: 'row-reverse' }]}>
          {item.departure_time && (
            <View style={[styles.timeBadge, isRTL && { flexDirection: 'row-reverse' }]}>
              <Ionicons name="sunny-outline" size={14} color={Colors.warning} />
              <Text style={styles.timeText}>
                {t('departure')}: {item.departure_time.substring(0, 5)}
              </Text>
            </View>
          )}
          {item.return_time && (
            <View style={[styles.timeBadge, isRTL && { flexDirection: 'row-reverse' }]}>
              <Ionicons name="moon-outline" size={14} color={Colors.secondary} />
              <Text style={styles.timeText}>
                {t('return')}: {item.return_time.substring(0, 5)}
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={[styles.cardFooter, isRTL && { flexDirection: 'row-reverse' }]}>
          <View style={[styles.seatBadge, isRTL && { flexDirection: 'row-reverse' }]}>
            <Ionicons name="people-outline" size={13} color={Colors.primary} />
            <Text style={styles.seatText}>
              {item.available_seats} {t('seat')}
            </Text>
          </View>
          <Text style={styles.price}>
            {item.price.toLocaleString()} {t('currency')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    overflow: 'hidden',
    ...Shadow.md,
  },
  cardRTL: {
    flexDirection: 'row-reverse',
  },
  cardAccent: {
    width: 4,
    backgroundColor: Colors.primary,
  },
  cardContent: {
    flex: 1,
    padding: Spacing.md,
  },
  routeName: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  routePath: {
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  routeStopText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  routeLine: {
    width: 1.5,
    height: 10,
    backgroundColor: Colors.border,
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  seatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primarySurface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.pill,
  },
  seatText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.primary,
  },
  price: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.success,
  },
});
