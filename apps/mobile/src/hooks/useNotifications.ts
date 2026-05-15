import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export function useNotifications() {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isExpoGo()) {
      logger.warn('[Notifications] Skipping — not supported in Expo Go (SDK 53+)');
      return;
    }

    let isMounted = true;

    async function initPushNotifications() {
      try {
        const Notifications = require('expo-notifications') as typeof import('expo-notifications');
        const Device = require('expo-device') as typeof import('expo-device');

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#C2703E',
          });
        }

        if (!Device.isDevice) {
          logger.warn('[Notifications] Must use physical device for Push Notifications');
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          logger.warn('[Notifications] Permission not granted');
          return;
        }

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const token = (
          await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
        ).data;

        if (token && isMounted) {
          const { error } = await supabase.rpc('register_push_token', {
            p_token: token,
          });
          if (error) {
            logger.warn('[Notifications] Error saving push token', { error: error.message });
          }
        }

        if (isMounted) {
          const notifSub = Notifications.addNotificationReceivedListener((notification) => {
            logger.info('[Notifications] Received', { title: notification.request.content.title });
          });

          const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
            logger.info('[Notifications] Interaction', {
              body: response.notification.request.content.body,
            });
          });

          cleanupRef.current = () => {
            notifSub.remove();
            responseSub.remove();
          };
        }
      } catch (error) {
        logger.warn('[Notifications] Init failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    initPushNotifications();

    return () => {
      isMounted = false;
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);
}
