import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRoutes } from '../src/hooks/useRoutes';
import { useAuthStore } from '../src/hooks/useStore';
import { useTranslation } from '../src/hooks/useTranslation';
import { useRouter } from 'expo-router';
import { Route } from '@uniride/core';
import { Colors, Typography, Spacing, BorderRadius, Shadow, FontFamily } from '../src/theme';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '../src/lib/logger';

export default function DiscoveryPage() {
  const { profile } = useAuthStore();
  const { routes, isLoading, error, refetch } = useRoutes(profile?.institution_id);
  const { t, isRTL } = useTranslation();
  const router = useRouter();

  const greeting = profile?.full_name
    ? `${t('hello')}، ${profile.full_name.split(' ')[0]} 👋`
    : `${t('hello')} 👋`;

  const renderRoute = ({ item }: { item: Route }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/booking', params: { routeId: item.id } })}
      activeOpacity={0.85}
    >
      {/* Orange accent bar */}
      <View style={styles.cardAccent} />

      <View style={styles.cardContent}>
        {/* Route Name */}
        <Text style={styles.routeName} numberOfLines={1}>
          {item.title}
        </Text>

        {/* From → To */}
        <View style={styles.routePath}>
          <View style={styles.routeStop}>
            <Ionicons name="radio-button-on" size={12} color={Colors.primary} />
            <Text style={styles.routeStopText} numberOfLines={1}>
              {item.start_location}
            </Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeStop}>
            <Ionicons name="location" size={12} color={Colors.secondary} />
            <Text style={styles.routeStopText} numberOfLines={1}>
              {item.end_location}
            </Text>
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.scheduleRow}>
          {item.departure_time && (
            <View style={styles.timeBadge}>
              <Ionicons name="sunny-outline" size={14} color={Colors.warning} />
              <Text style={styles.timeText}>
                {t('departure')}: {item.departure_time.substring(0, 5)}
              </Text>
            </View>
          )}
          {item.return_time && (
            <View style={styles.timeBadge}>
              <Ionicons name="moon-outline" size={14} color={Colors.secondary} />
              <Text style={styles.timeText}>
                {t('return')}: {item.return_time.substring(0, 5)}
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.seatBadge}>
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

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="bus-outline" size={64} color={Colors.border} />
      <Text style={styles.emptyTitle}>{t('no_available_routes')}</Text>
      <Text style={styles.emptySubtitle}>{t('pull_to_refresh')}</Text>
    </View>
  );

  const ListError = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="wifi-outline" size={64} color={Colors.error} />
      <Text style={styles.emptyTitle}>{t('failed_to_load_routes')}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={refetch}>
        <Text style={styles.retryText}>{t('retry')}</Text>
      </TouchableOpacity>
    </View>
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&countrycodes=iq&limit=5`,
        { headers: { 'User-Agent': 'UniRide-App' } },
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      logger.warn('Geocoding search failed', {
        error: error instanceof Error ? error.message : String(error),
        query: text,
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.secondary} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.headerSubtitle}>{t('search_routes_subtitle')}</Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/profile')}>
          <Ionicons name="person-circle-outline" size={36} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={t('search_routes_placeholder')}
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {isSearching && <ActivityIndicator size="small" color={Colors.primary} />}
        </View>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            {searchResults.map((result, index) => (
              <TouchableOpacity
                key={index}
                style={styles.searchResultItem}
                onPress={() => {
                  setSearchQuery(result.display_name.split(',')[0]);
                  setSearchResults([]);
                }}
              >
                <Ionicons name="location-outline" size={16} color={Colors.textMuted} />
                <Text
                  style={[styles.searchResultText, { textAlign: isRTL ? 'right' : 'left' }]}
                  numberOfLines={1}
                >
                  {result.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* License Banner */}
      <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
        <TouchableOpacity
          style={styles.licenseBanner}
          onPress={() => router.push('/activate')}
          activeOpacity={0.8}
        >
          <View style={styles.licenseBannerContent}>
            <Ionicons name="card-outline" size={24} color={Colors.primary} />
            <View>
              <Text style={styles.licenseBannerTitle}>{t('activate_new_license')}</Text>
              <Text style={styles.licenseBannerSubtitle}>{t('activate_license_description')}</Text>
            </View>
          </View>
          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={20}
            color={Colors.border}
          />
        </TouchableOpacity>
      </View>

      {/* Routes List */}
      <FlatList
        data={error ? [] : routes}
        keyExtractor={(item) => item.id}
        renderItem={renderRoute}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={error ? <ListError /> : <ListEmpty />}
        ListHeaderComponent={
          routes.length > 0 ? (
            <Text style={styles.sectionTitle}>
              {routes.length} {t('available_routes_count')}
            </Text>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Header
  header: {
    backgroundColor: Colors.secondary,
    paddingTop: Spacing.xl + 12,
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: Colors.white,
  },
  headerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  profileButton: {
    padding: Spacing.xs,
  },
  // Search
  searchContainer: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    height: 56,
    borderRadius: BorderRadius.pill,
    ...Shadow.sm,
  },
  searchResults: {
    position: 'absolute',
    top: 76,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.sm,
    ...Shadow.md,
    zIndex: 100,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface,
  },
  searchResultText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.text,
    flex: 1,
    textAlign: 'right',
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Colors.text,
    textAlign: 'right',
    paddingHorizontal: Spacing.md,
  },
  // License Banner
  licenseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  licenseBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  licenseBannerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.text,
    textAlign: 'right',
  },
  licenseBannerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  // List
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  sectionTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    textAlign: 'right',
  },
  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    overflow: 'hidden',
    ...Shadow.md,
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
    textAlign: 'right',
  },
  routePath: {
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    justifyContent: 'flex-end',
  },
  routeStopText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    textAlign: 'right',
  },
  routeLine: {
    width: 1.5,
    height: 10,
    backgroundColor: Colors.border,
    marginRight: 5,
    alignSelf: 'flex-end',
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
    justifyContent: 'flex-end',
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
  // Empty / Error
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.section,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.textSecondary,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textMuted,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryText: {
    fontFamily: FontFamily.bold,
    color: Colors.white,
    fontSize: 14,
  },
});
