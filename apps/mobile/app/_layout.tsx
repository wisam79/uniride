import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { OfflineCache } from '../src/lib/offlineCache';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/hooks/useStore';
import { useTranslation } from '../src/hooks/useTranslation';
import { useNetworkStatus } from '../src/hooks/useNetworkStatus';
import { useNotifications } from '../src/hooks/useNotifications';
import { I18nManager, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { Colors } from '../src/theme';
import { logger } from '../src/lib/logger';
import * as Font from 'expo-font';
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

const FONT_TIMEOUT_MS = 6000;

export default function Layout() {
  const { user, role, initialized, setAuth, setProfile, setInitialized } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const { isRTL, t } = useTranslation();
  const { isOnline } = useNetworkStatus();
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontTimedOut, setFontTimedOut] = useState(false);

  useNotifications();

  // Load fonts manually to avoid hook conflicts from wrapper packages
  useEffect(() => {
    const timer = setTimeout(() => setFontTimedOut(true), FONT_TIMEOUT_MS);

    Font.loadAsync({
      IBMPlexSansArabic_400Regular: IBMPlexSansArabic_400Regular,
      IBMPlexSansArabic_500Medium: IBMPlexSansArabic_500Medium,
      IBMPlexSansArabic_700Bold: IBMPlexSansArabic_700Bold,
    })
      .then(() => {
        setFontsLoaded(true);
        clearTimeout(timer);
      })
      .catch((err) => {
        logger.warn('[Fonts] Load failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        setFontsLoaded(true);
        clearTimeout(timer);
      });

    return () => clearTimeout(timer);
  }, []);

  const canRender = fontsLoaded || fontTimedOut;

  useEffect(() => {
    if (isRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(true);
    }
  }, [isRTL]);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        try {
          if (session?.user) {
            const role = session.user.app_metadata?.role || 'student';
            // ✅ لا نمرر user_metadata — app_metadata فقط للـ role
            setAuth(
              {
                id: session.user.id,
                ...(session.user.email !== undefined ? { email: session.user.email } : {}),
              },
              role,
            );
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, phone, institution_id')
              .eq('id', session.user.id)
              .single();
            if (profileData) {
              setProfile({
                full_name: profileData.full_name || '',
                phone: profileData.phone || '',
                institution_id: profileData.institution_id,
              });
            }
          }
        } catch (error) {
          logger.error('[Auth] getSession inner error', {
            error: error instanceof Error ? error.message : String(error),
          });
        } finally {
          setInitialized(true);
        }
      })
      .catch((error) => {
        logger.error('[Auth] getSession error', {
          error: error instanceof Error ? error.message : String(error),
        });
        setInitialized(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session?.user) {
          const role = session.user.app_metadata?.role || 'student';
          // ✅ لا نمرر user_metadata — app_metadata فقط للـ role
          setAuth(
            {
              id: session.user.id,
              ...(session.user.email !== undefined ? { email: session.user.email } : {}),
            },
            role,
          );
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, phone, institution_id')
            .eq('id', session.user.id)
            .single();
          if (profileData) {
            setProfile({
              full_name: profileData.full_name || '',
              phone: profileData.phone || '',
              institution_id: profileData.institution_id,
            });
          }
        } else {
          setAuth(null, null);
          // REQ-5: تنظيف SecureStore عند تسجيل الخروج
          Promise.all([
            SecureStore.deleteItemAsync('auth-storage').catch(() => {}),
            SecureStore.deleteItemAsync('booking-storage').catch(() => {}),
            OfflineCache.clear(),
          ]).catch(() => {});
        }
      } catch (error) {
        logger.error('[Auth] onAuthStateChange inner error', {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setInitialized(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'onboarding';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      if (role === 'driver') {
        router.replace('/driver');
      } else {
        router.replace('/');
      }
    }
  }, [initialized, segments, user]);

  useEffect(() => {
    if (canRender) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [canRender]);

  if (!canRender) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={styles.root}>
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>{t('no_internet')}</Text>
          </View>
        )}
        <Stack screenOptions={{ headerShown: true, headerBackTitle: t('go_back_short') }}>
          <Stack.Screen name="index" options={{ title: t('home'), headerShown: false }} />
          <Stack.Screen name="booking" options={{ title: t('book_trip') }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ title: t('account') }} />
          <Stack.Screen name="subscriptions" options={{ title: t('my_subscriptions') }} />
          <Stack.Screen name="tracking/[tripId]" options={{ title: t('live_tracking') }} />
          <Stack.Screen name="activate" options={{ title: t('activate_subscription') }} />
          <Stack.Screen name="create-trip" options={{ title: t('create_trip') }} />
          <Stack.Screen
            name="rating/[tripId]"
            options={{ title: t('rating'), headerShown: false }}
          />
          <Stack.Screen name="driver" options={{ title: t('driver_dashboard'), headerShown: false }} />
        </Stack>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundDark,
  },
  offlineBanner: {
    backgroundColor: Colors.warning,
    paddingVertical: 6,
    alignItems: 'center',
  },
  offlineText: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: 'IBMPlexSansArabic_500Medium',
  },
});
