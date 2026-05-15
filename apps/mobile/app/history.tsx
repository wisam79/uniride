import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '../src/hooks/useTranslation';
import { useTripHistory, TripHistoryItem } from '../src/hooks/useTripHistory';
import { Colors, FontFamily, Spacing, BorderRadius, Shadow } from '../src/theme';
import { Ionicons } from '@expo/vector-icons';

const STATUS_COLORS: Record<string, string> = {
  completed: Colors.success,
  cancelled: Colors.error,
  absent: Colors.warning,
};

export default function HistoryScreen() {
  const { t, isRTL, language } = useTranslation();
  const router = useRouter();
  const [page, setPage] = useState(0);
  const { trips, isLoading, refetch, hasMore, isPending } = useTripHistory(page);

  const handleRefresh = useCallback(() => {
    setPage(0);
    refetch();
  }, [refetch]);

  const loadMore = useCallback(() => {
    if (hasMore && !isPending) {
      setPage((p) => p + 1);
    }
  }, [hasMore, isPending]);

  const renderItem = ({ item }: { item: TripHistoryItem }) => {
    const statusColor = STATUS_COLORS[item.status] || Colors.textMuted;
    const locale = language === 'ar' ? 'ar-IQ' : 'en-US';

    return (
      <View style={styles.card}>
        <View style={[styles.cardHeader, isRTL && styles.rowReverse]}>
          <Text style={[styles.routeTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {item.routes?.title || t('unknown_route')}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{t(item.status)}</Text>
          </View>
        </View>

        <View style={[styles.infoRow, isRTL && styles.rowReverse]}>
          <Ionicons name="person-outline" size={16} color={Colors.textMuted} />
          <Text style={[styles.infoText, { textAlign: isRTL ? 'right' : 'left' }]}>
            {item.driver?.full_name || t('unknown_driver')}
          </Text>
        </View>

        <View style={[styles.infoRow, isRTL && styles.rowReverse]}>
          <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
          <Text style={[styles.infoText, { textAlign: isRTL ? 'right' : 'left' }]}>
            {new Date(item.created_at).toLocaleDateString(locale)}{' '}
            {new Date(item.created_at).toLocaleTimeString(locale)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <View style={[styles.header, isRTL && styles.rowReverse]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('trip_history')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading && page === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={trips || []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && page === 0}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="receipt-outline" size={60} color={Colors.border} />
              <Text style={styles.emptyText}>{t('no_trips_found')}</Text>
            </View>
          }
          ListFooterComponent={
            isPending && page > 0 ? (
              <ActivityIndicator style={{ margin: Spacing.md }} color={Colors.primary} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    ...Shadow.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.text,
  },
  listContent: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
    gap: Spacing.md,
  },
  emptyText: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: Colors.textMuted,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  routeTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.text,
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  infoText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
});
