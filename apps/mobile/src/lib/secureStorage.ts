import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

// adapter يتوافق مع StateStorage interface الخاصة بـ Zustand
export const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      logger.warn('SecureStore unavailable, falling back to AsyncStorage', { key });
      try {
        return await AsyncStorage.getItem(key);
      } catch {
        return null;
      }
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      logger.warn('SecureStore unavailable, falling back to AsyncStorage', { key });
      try {
        await AsyncStorage.setItem(key, value);
      } catch {
        // لا تُرمى أخطاء للمستدعي
      }
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      logger.warn('SecureStore unavailable, falling back to AsyncStorage', { key });
      try {
        await AsyncStorage.removeItem(key);
      } catch {
        // لا تُرمى أخطاء للمستدعي
      }
    }
  },
};
