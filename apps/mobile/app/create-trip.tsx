import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { Colors, FontFamily, Spacing, BorderRadius, Shadow } from '../src/theme';
import { Ionicons } from '@expo/vector-icons';
import { Route } from '@uniride/core';

export default function CreateTripScreen() {
  const router = useRouter();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMyRoutes() {
      try {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: driverData, error: driverError } = await supabase
          .from('drivers')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (driverError || !driverData) throw driverError || new Error('Driver profile not found');

        // Fetch routes assigned to this driver
        const { data, error } = await supabase
          .from('routes')
          .select('*')
          .eq('driver_id', driverData.id)
          .eq('is_active', true);

        if (error) throw error;
        setRoutes(data as Route[] || []);
      } catch (err: any) {
        Alert.alert('خطأ', err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMyRoutes();
  }, []);

  const handleCreateTrip = async () => {
    if (!selectedRouteId) return;

    try {
      setIsSubmitting(true);
      // Create trip scheduled for now
      const scheduledAt = new Date().toISOString();

      const { data, error } = await supabase.rpc('create_trip', {
        p_route_id: selectedRouteId,
        p_scheduled_at: scheduledAt,
      });

      if (error) throw error;

      Alert.alert('نجاح', 'تم فتح الرحلة واستقبال الطلاب بنجاح', [
        { text: 'حسناً', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('خطأ في إنشاء الرحلة', err.message || 'حاول مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>رحلة جديدة</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.pageSubtitle}>اختر الخط الذي ستقوم بالرحلة عليه الآن:</Text>

      <FlatList
        data={routes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isSelected = selectedRouteId === item.id;
          return (
            <TouchableOpacity
              style={[styles.routeCard, isSelected && styles.routeCardSelected]}
              onPress={() => setSelectedRouteId(item.id)}
              activeOpacity={0.8}
            >
              <View style={styles.routeHeader}>
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={24}
                  color={isSelected ? Colors.primary : Colors.border}
                />
                <Text style={[styles.routeTitle, isSelected && styles.routeTitleSelected]}>
                  {item.title}
                </Text>
              </View>

              <View style={styles.routeDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="people-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>{item.capacity} راكب</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="cash-outline" size={16} color={Colors.textSecondary} />
                  <Text style={styles.detailText}>{item.price} د.ع</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bus-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyText}>لم يتم تخصيص خطوط لك بعد</Text>
          </View>
        }
      />

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, !selectedRouteId && styles.submitButtonDisabled]}
          onPress={handleCreateTrip}
          disabled={!selectedRouteId || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>فتح الرحلة الآن</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl + 20,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surfaceMuted,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.text,
  },
  pageSubtitle: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'right',
    padding: Spacing.lg,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  routeCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadow.sm,
  },
  routeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySurface,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  routeTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.text,
    textAlign: 'right',
    flex: 1,
    marginRight: Spacing.sm,
  },
  routeTitleSelected: {
    color: Colors.primary,
  },
  routeDetails: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.section,
    gap: Spacing.md,
  },
  emptyText: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Colors.textMuted,
  },
  footer: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadow.md,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.border,
  },
  submitButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.white,
  },
});
