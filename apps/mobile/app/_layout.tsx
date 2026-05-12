import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useCallback } from 'react';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/hooks/useStore';
import { useTranslation } from '../src/hooks/useTranslation';
import { useNetworkStatus } from '../src/hooks/useNetworkStatus';
import { useNotifications } from '../src/hooks/useNotifications';
import { I18nManager, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { Colors } from '../src/theme';
import {
  useFonts,
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while fonts load
SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const { user, role, initialized, setAuth, setProfile, setInitialized } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const { isRTL, t } = useTranslation();
  const { isOnline } = useNetworkStatus();

  // Initialize push notifications globally
  useNotifications();

  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_700Bold,
  });

  // RTL setup
  useEffect(() => {
    if (isRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(true);
    }
  }, [isRTL]);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        try {
          if (session?.user) {
            const role = session.user.app_metadata?.role || 'student'; // SECURITY: app_metadata only
            setAuth({ id: session.user.id, email: session.user.email, user_metadata: session.user.user_metadata }, role);
            // Fetch full profile from DB (includes institution_id for smart matching)
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
          console.warn('[Auth] getSession inner error:', error);
        } finally {
          setInitialized(true);
        }
      })
      .catch((error) => {
        console.warn('[Auth] getSession error:', error);
        setInitialized(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session?.user) {
          const role = session.user.app_metadata?.role || 'student'; // SECURITY: app_metadata only
          setAuth({ id: session.user.id, email: session.user.email, user_metadata: session.user.user_metadata }, role);
          // Fetch full profile from DB (includes institution_id for smart matching)
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
        }
      } catch (error) {
        console.warn('[Auth] onAuthStateChange inner error:', error);
      } finally {
        setInitialized(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Navigation guard
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

  // Hide splash screen once fonts are ready
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Show brand-colored loading while fonts load
  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!initialized) return null;

  return (
    <ErrorBoundary>
      <View style={styles.root} onLayout={onLayoutRootView}>
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>{t('no_internet')}</Text>
          </View>
        )}
        <Stack screenOptions={{ headerShown: true, headerBackTitle: 'رجوع' }}>
          <Stack.Screen name="index" options={{ title: 'الرئيسية', headerShown: false }} />
          <Stack.Screen name="booking" options={{ title: 'حجز رحلة' }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ title: 'الحساب' }} />
          <Stack.Screen name="subscriptions" options={{ title: 'اشتراكاتي' }} />
          <Stack.Screen name="tracking/[tripId]" options={{ title: 'تتبع الرحلة' }} />
          <Stack.Screen name="activate" options={{ title: 'تفعيل اشتراك' }} />
          <Stack.Screen name="create-trip" options={{ title: 'إنشاء رحلة' }} />
          <Stack.Screen name="rating/[tripId]" options={{ title: 'تقييم الرحلة', headerShown: false }} />
          <Stack.Screen
            name="driver"
            options={{ title: 'لوحة السائق', headerShown: false }}
          />
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
