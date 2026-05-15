import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { supabase } from '../src/lib/supabase';
import { useAuthStore, useTripStore } from '../src/hooks/useStore';
import { useDriverTrips, useLocationTracker } from '../src/hooks/useTrips';
import { useDriverBalance } from '../src/hooks/useDriverBalance';
import { useTranslation } from '../src/hooks/useTranslation';
import { canTransition, TripStatus, Route } from '@uniride/core';
import { Colors, FontFamily, Spacing, BorderRadius, Shadow } from '../src/theme';
import { Ionicons } from '@expo/vector-icons';

interface DriverTrip {
  id: string;
  route_id: string;
  driver_id: string;
  status: TripStatus;
  scheduled_at: string;
  started_at: string | null;
  ended_at: string | null;
  last_lat: number | null;
  last_lng: number | null;
  routes?: Route | null;
}

async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  } catch {
    return null;
  }
}

export default function DriverDashboard() {
  const { trips, isLoading: tripsLoading, refetch: refetchTrips } = useDriverTrips();
  const { balance, isLoading: balanceLoading, refetch: refetchBalance } = useDriverBalance();
  const { profile, logout, user } = useAuthStore();
  const { startTracking, stopTracking } = useLocationTracker();
  const { t, isRTL, language } = useTranslation();
  const router = useRouter();
  const [updatingTripId, setUpdatingTripId] = useState<string | null>(null);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const { activeTripId, setActiveTrip, updateStatus, clearTrip } = useTripStore();

  const STATUS_DISPLAY: Record<
    TripStatus,
    { label: string; color: string; bg: string; icon: string }
  > = useMemo(
    () => ({
      scheduled: {
        label: t('scheduled'),
        color: Colors.warning,
        bg: Colors.warningSurface,
        icon: 'calendar-outline',
      },
      driver_waiting: {
        label: t('driver_waiting'),
        color: Colors.primary,
        bg: Colors.primarySurface,
        icon: 'time-outline',
      },
      in_transit: {
        label: t('in_transit'),
        color: Colors.success,
        bg: Colors.successSurface,
        icon: 'navigate-outline',
      },
      completed: {
        label: t('completed'),
        color: Colors.textMuted,
        bg: Colors.surfaceMuted,
        icon: 'checkmark-circle-outline',
      },
      absent: {
        label: t('absent'),
        color: Colors.textMuted,
        bg: Colors.surfaceMuted,
        icon: 'person-remove-outline',
      },
      cancelled: {
        label: t('cancelled'),
        color: Colors.error,
        bg: Colors.errorSurface,
        icon: 'ban-outline',
      },
    }),
    [t],
  );

  const getErrorMessage = useCallback(
    (err: unknown): string => {
      if (err instanceof Error) return err.message;
      if (typeof err === 'string') return err;
      return t('error_generic');
    },
    [t],
  );

  const handleRefresh = useCallback(() => {
    refetchTrips();
    refetchBalance();
  }, [refetchTrips, refetchBalance]);

  const handleRequestPayout = async () => {
    if (!balance || balance.available_to_withdraw <= 0) return;

    Alert.alert(
      t('request_payout_title'),
      `${t('request_payout_confirm')} (${balance.available_to_withdraw.toLocaleString()} ${t('currency')})`,
      [
        { text: t('go_back_short'), style: 'cancel' },
        {
          text: t('confirm_request'),
          onPress: async () => {
            setRequestingPayout(true);
            try {
              const { data: driverData, error: driverError } = await supabase
                .from('drivers')
                .select('id')
                .eq('user_id', user?.id)
                .single();

              if (driverError || !driverData) throw new Error('Driver not found');

              const { error } = await supabase.from('driver_payouts').insert({
                driver_id: driverData.id,
                amount: balance.available_to_withdraw,
                status: 'pending',
              });

              if (error) throw error;
              Alert.alert(t('success'), t('payout_submitted_success'));
              refetchBalance();
            } catch (err: unknown) {
              Alert.alert(t('error'), getErrorMessage(err));
            } finally {
              setRequestingPayout(false);
            }
          },
        },
      ],
    );
  };

  const getNextAction = (status: TripStatus): { label: string; newStatus: TripStatus } | null => {
    switch (status) {
      case 'scheduled':
        return { label: t('start_receiving_students'), newStatus: 'driver_waiting' as TripStatus };
      case 'driver_waiting':
        return { label: t('start_trip_action'), newStatus: 'in_transit' as TripStatus };
      case 'in_transit':
        return { label: t('end_trip'), newStatus: 'completed' as TripStatus };
      default:
        return null;
    }
  };

  const handleStatusUpdate = useCallback(
    async (tripId: string, currentStatus: TripStatus, newStatus: TripStatus) => {
      if (!canTransition(currentStatus, newStatus)) {
        Alert.alert(t('error'), t('invalid_transition'));
        return;
      }

      setUpdatingTripId(tripId);

      try {
        let lat: number | null = null;
        let lng: number | null = null;

        const loc = await getCurrentLocation();
        if (loc) {
          lat = loc.lat;
          lng = loc.lng;
        }

        const { error } = await supabase.functions.invoke('trip-engine', {
          body: { tripId, newStatus, lat, lng },
        });

        if (error) throw error;

        if (newStatus === 'in_transit') {
          setActiveTrip(tripId, newStatus, '');
          startTracking(tripId);
        } else if (
          newStatus === 'completed' ||
          newStatus === 'absent' ||
          newStatus === 'cancelled'
        ) {
          stopTracking();
          if (activeTripId === tripId) {
            clearTrip();
          }
        } else {
          updateStatus(newStatus);
        }

        refetchTrips();
      } catch (err: unknown) {
        Alert.alert(t('error'), getErrorMessage(err));
      } finally {
        setUpdatingTripId(null);
      }
    },
    [
      activeTripId,
      startTracking,
      stopTracking,
      setActiveTrip,
      clearTrip,
      updateStatus,
      refetchTrips,
      t,
      getErrorMessage,
    ],
  );

  const handleCancelTrip = useCallback(
    async (tripId: string, currentStatus: TripStatus) => {
      Alert.alert(t('cancel_trip'), t('cancel_trip_confirm'), [
        { text: t('go_back_short'), style: 'cancel' },
        {
          text: t('yes_cancel'),
          style: 'destructive',
          onPress: () => handleStatusUpdate(tripId, currentStatus, 'cancelled' as TripStatus),
        },
      ]);
    },
    [handleStatusUpdate, t],
  );

  const handleLogout = async () => {
    stopTracking();
    await supabase.auth.signOut();
    logout();
  };

  const renderItem = ({ item }: { item: DriverTrip }) => {
    const statusDisplay = STATUS_DISPLAY[item.status] ?? STATUS_DISPLAY['scheduled']!;
    const nextAction = getNextAction(item.status as TripStatus);
    const isUpdating = updatingTripId === item.id;
    const locale = language === 'ar' ? 'ar-IQ' : 'en-US';
    const tripDate = new Date(item.scheduled_at).toLocaleDateString(locale);
    const tripTime = new Date(item.scheduled_at).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.tripCard}>
        {/* Header */}
        <View style={[styles.tripHeader, isRTL && styles.rowReverse]}>
          <View style={[styles.statusBadge, { backgroundColor: statusDisplay.bg }, isRTL && styles.rowReverse]}>
            <Ionicons name={statusDisplay.icon as any} size={14} color={statusDisplay.color} />
            <Text style={[styles.statusText, { color: statusDisplay.color }]}>
              {statusDisplay.label}
            </Text>
          </View>
          <Text style={styles.tripTime}>
            {tripDate} {tripTime}
          </Text>
        </View>

        {/* Route Info */}
        {item.routes && (
          <View style={[styles.routeContainer, isRTL && styles.rowReverse]}>
            <Ionicons name="bus-outline" size={24} color={Colors.secondaryLight} />
            <Text style={[styles.routeInfo, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
              {item.routes.title}
            </Text>
          </View>
        )}

        {/* Actions */}
        {nextAction && (
          <View style={[styles.actionRow, isRTL && styles.rowReverse]}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: statusDisplay.color }]}
              onPress={() => handleStatusUpdate(item.id, item.status, nextAction.newStatus)}
              disabled={isUpdating}
              activeOpacity={0.85}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.actionText}>{nextAction.label}</Text>
              )}
            </TouchableOpacity>

            {(item.status === 'scheduled' || item.status === 'driver_waiting') && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancelTrip(item.id, item.status)}
                disabled={isUpdating}
                activeOpacity={0.85}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.secondary} />

      {/* Header */}
      <View style={[styles.header, isRTL && styles.rowReverse]}>
        <View style={[styles.headerTitleContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={styles.headerTitle}>{t('driver_dashboard')}</Text>
          {profile?.full_name && (
            <Text style={styles.headerSubtitle}>{t('hello')}, {profile.full_name}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push('/profile')}
          activeOpacity={0.8}
        >
          <Ionicons name="person-circle-outline" size={36} color={Colors.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={24} color={Colors.errorSurface} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={trips as unknown as DriverTrip[]}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={tripsLoading || balanceLoading}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={
          balance ? (
            <View style={[styles.balanceCard, isRTL && styles.rowReverse]}>
              <View style={[styles.balanceInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={styles.balanceLabel}>{t('available_balance')}</Text>
                <Text style={styles.balanceAmount}>
                  {balance.available_to_withdraw.toLocaleString()} {t('currency')}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.payoutButton,
                  (balance.available_to_withdraw <= 0 || requestingPayout) &&
                    styles.payoutButtonDisabled,
                ]}
                onPress={handleRequestPayout}
                disabled={balance.available_to_withdraw <= 0 || requestingPayout}
                activeOpacity={0.85}
              >
                {requestingPayout ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.payoutButtonText}>{t('withdraw_request')}</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="car-outline" size={64} color={Colors.border} />
            <Text style={styles.emptyText}>{t('no_scheduled_trips')}</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, isRTL ? { left: Spacing.xl } : { right: Spacing.xl }]}
        activeOpacity={0.9}
        onPress={() => router.push('/create-trip')}
      >
        <Ionicons name="add" size={32} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  rowReverse: { flexDirection: 'row-reverse' },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingTop: Spacing.xl + 12,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Colors.white,
  },
  headerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  profileButton: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  logoutButton: {
    padding: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.sm,
  },
  // List
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.section,
    gap: Spacing.md,
  },
  emptyText: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: Colors.textMuted,
  },
  // Balance Card
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primarySurface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.1)',
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.primary,
    marginBottom: 4,
  },
  balanceAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Colors.primary,
  },
  payoutButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadow.sm,
  },
  payoutButtonDisabled: {
    opacity: 0.5,
  },
  payoutButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.white,
  },
  // Card
  tripCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
  },
  statusText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
  },
  tripTime: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceMuted,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  routeInfo: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.text,
  },
  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  actionText: {
    fontFamily: FontFamily.bold,
    color: Colors.white,
    fontSize: 15,
  },
  cancelButton: {
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.errorSurface,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xxxl,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.lg,
  },
});
