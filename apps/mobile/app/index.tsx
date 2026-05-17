import React, { useState, useCallback } from 'react';
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
import { useSubscriptions } from '../src/hooks/useTrips';
import { useAuthStore } from '../src/hooks/useStore';
import { useTranslation } from '../src/hooks/useTranslation';
import { useRouter, useFocusEffect } from 'expo-router';
import { Route } from '@uniride/core';
import { Colors, Typography, Spacing, BorderRadius, Shadow, FontFamily } from '../src/theme';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '../src/lib/logger';
import { supabase } from '../src/lib/supabase';
import { RouteCard } from '../src/components/RouteCard';
import { ActiveSubscriptionCard } from '../src/components/ActiveSubscriptionCard';
import { LicenseActivationBanner } from '../src/components/LicenseActivationBanner';

export default function DiscoveryPage() {
  const { profile, role } = useAuthStore();
  const { routes, isLoading: routesLoading, error, refetch: refetchRoutes } = useRoutes(profile?.institution_id);
  const { subscriptions, isLoading: subsLoading, refetch: refetchSubs } = useSubscriptions();
  const { t, isRTL, language } = useTranslation();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      refetchSubs();
    }, [refetchSubs])
  );

  const activeSub = subscriptions.find((s) => s.status === 'active');
  const isLoading = routesLoading || subsLoading;

  const onRefresh = async () => {
    await Promise.all([refetchRoutes(), refetchSubs()]);
  };

  const handleTrackActiveTrip = async () => {
    if (!activeSub) return;
    try {
      const { data: activeTrip } = await supabase
        .from('trips')
        .select('id')
        .eq('route_id', activeSub.route_id)
        .in('status', ['driver_waiting', 'in_transit'])
        .order('scheduled_at', { ascending: false })
        .limit(1)
        .single();

      if (activeTrip) {
        router.push({
          pathname: '/tracking/[tripId]',
          params: { tripId: activeTrip.id },
        });
      } else {
        router.push('/subscriptions');
      }
    } catch {
      router.push('/subscriptions');
    }
  };

  const greeting = profile?.full_name
    ? `${t('hello')}، ${profile.full_name.split(' ')[0]} 👋`
    : `${t('hello')} 👋`;

  const renderRoute = ({ item }: { item: Route }) => <RouteCard item={item} />;

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
      <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
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

      {/* Subscription / License Section */}
      <View style={{ paddingHorizontal: 20, marginBottom: 15 }}>
        {subsLoading ? null : activeSub ? (
          <ActiveSubscriptionCard activeSub={activeSub} onTrackTrip={handleTrackActiveTrip} />
        ) : role === 'student' ? (
          <LicenseActivationBanner />
        ) : null}
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
            onRefresh={onRefresh}
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
        initialNumToRender={5}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
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
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Colors.text,
    paddingHorizontal: Spacing.md,
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
