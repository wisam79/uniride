import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Share,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useTripTracking } from '../../src/hooks/useTrips';
import { Colors, FontFamily, Spacing, BorderRadius, Shadow } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import { TripMap } from '../../src/components/TripMap';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  scheduled: {
    color: Colors.warning,
    bg: Colors.warningSurface,
    label: 'مجدولة',
    icon: 'calendar-outline',
  },
  driver_waiting: {
    color: Colors.primary,
    bg: Colors.primarySurface,
    label: 'السائق بانتظارك',
    icon: 'bus-outline',
  },
  in_transit: {
    color: Colors.success,
    bg: Colors.successSurface,
    label: 'في الطريق',
    icon: 'navigate-outline',
  },
  completed: {
    color: Colors.textMuted,
    bg: Colors.surfaceMuted,
    label: 'مكتملة',
    icon: 'checkmark-circle-outline',
  },
  absent: {
    color: Colors.textMuted,
    bg: Colors.surfaceMuted,
    label: 'غائب',
    icon: 'person-remove-outline',
  },
  cancelled: { color: Colors.error, bg: Colors.errorSurface, label: 'ملغاة', icon: 'ban-outline' },
};

export default function TrackingScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { trip, isLoading } = useTripTracking(tripId);
  const router = useRouter();

  useEffect(() => {
    if (trip?.status === 'completed') {
      // Redirect to rating screen after a short delay
      const timer = setTimeout(() => {
        router.replace({ pathname: '/rating/[tripId]', params: { tripId: trip.id } });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [trip?.status]);

  const handleShare = async () => {
    if (!trip) return;
    try {
      const message = `أنا الآن على متن رحلة يونيرايد 🚌\nالخط: ${trip.routes?.title || 'خط نقل'}\nالسائق: ${trip.driver?.full_name || 'سائق يونيرايد'}\nتتبع رحلتي هنا!`;
      await Share.share({ message });
    } catch (error: any) {
      Alert.alert('خطأ', 'فشل في مشاركة الرحلة');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.border} />
        <Text style={styles.errorText}>لم يتم العثور على الرحلة</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>رجوع</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = STATUS_CONFIG[trip.status] ?? STATUS_CONFIG['scheduled']!;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.statusCard}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Ionicons name={status.icon as any} size={16} color={status.color} />
          <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
        </View>

        {/* Real Map */}
        <View style={styles.mapPlaceholder}>
          {trip.routes &&
          trip.routes.start_lat &&
          trip.routes.start_lng &&
          trip.routes.end_lat &&
          trip.routes.end_lng ? (
            <TripMap
              startLat={trip.routes.start_lat}
              startLng={trip.routes.start_lng}
              endLat={trip.routes.end_lat}
              endLng={trip.routes.end_lng}
              driverLat={trip.last_lat}
              driverLng={trip.last_lng}
            />
          ) : (
            <>
              <Ionicons name="map-outline" size={48} color={Colors.primaryLight} />
              <Text style={styles.noLocation}>إحداثيات الخط غير متوفرة</Text>
            </>
          )}
        </View>

        {/* Driver Card */}
        <View style={styles.driverCard}>
          <View style={styles.driverInfo}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={24} color={Colors.white} />
            </View>
            <View>
              <Text style={styles.driverName}>{trip.driver?.full_name || 'سائق يونيرايد'}</Text>
              <Text style={styles.driverLabel}>السائق الحالي</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.7}>
            <Ionicons name="share-social-outline" size={20} color={Colors.primary} />
            <Text style={styles.shareText}>مشاركة</Text>
          </TouchableOpacity>
        </View>

        {/* Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="bus-outline" size={20} color={Colors.secondary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>تفاصيل الخط</Text>
              <Text style={styles.infoValue}>{trip.routes?.title || 'خط نقل'}</Text>
            </View>
          </View>

          {trip.started_at && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Ionicons name="time-outline" size={20} color={Colors.secondary} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>وقت الانطلاق</Text>
                <Text style={styles.infoValue}>
                  {new Date(trip.started_at).toLocaleTimeString('ar-IQ')}
                </Text>
              </View>
            </View>
          )}

          {trip.ended_at && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <Ionicons name="flag-outline" size={20} color={Colors.secondary} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>وقت الوصول</Text>
                <Text style={styles.infoValue}>
                  {new Date(trip.ended_at).toLocaleTimeString('ar-IQ')}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  // Card
  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadow.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    marginBottom: Spacing.lg,
  },
  statusLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.xl,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverName: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.text,
  },
  driverLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primarySurface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
  },
  shareText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.primary,
  },
  detailsContainer: {
    marginTop: Spacing.xl,
    gap: Spacing.lg,
  },
  // Map
  mapPlaceholder: {
    height: 220,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  coordsBox: {
    marginTop: Spacing.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    ...Shadow.sm,
  },
  coordsText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.text,
    textAlign: 'center',
  },
  noLocation: {
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: Spacing.sm,
  },
  // Details (merged — was duplicated)
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
    ...Shadow.sm,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
    textAlign: 'right',
  },
  infoValue: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.text,
    textAlign: 'right',
  },
  // Error
  errorText: {
    fontFamily: FontFamily.bold,
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  backText: {
    fontFamily: FontFamily.bold,
    color: Colors.white,
    fontSize: 14,
  },
});
