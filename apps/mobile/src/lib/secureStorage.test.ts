import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from './secureStorage';

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe('secureStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gets item from SecureStore', async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValue('val');
    const res = await secureStorage.getItem('k1');
    expect(res).toBe('val');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('k1');
  });

  it('falls back to AsyncStorage if SecureStore fails on getItem', async () => {
    vi.mocked(SecureStore.getItemAsync).mockRejectedValue(new Error('fail'));
    vi.mocked(AsyncStorage.getItem).mockResolvedValue('async_val');
    const res = await secureStorage.getItem('k1');
    expect(res).toBe('async_val');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('k1');
  });

  it('returns null if both fail on getItem', async () => {
    vi.mocked(SecureStore.getItemAsync).mockRejectedValue(new Error('fail'));
    vi.mocked(AsyncStorage.getItem).mockRejectedValue(new Error('fail2'));
    const res = await secureStorage.getItem('k1');
    expect(res).toBeNull();
  });

  it('sets item in SecureStore', async () => {
    vi.mocked(SecureStore.setItemAsync).mockResolvedValue(undefined);
    await secureStorage.setItem('k1', 'val');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('k1', 'val');
  });

  it('falls back to AsyncStorage if SecureStore fails on setItem', async () => {
    vi.mocked(SecureStore.setItemAsync).mockRejectedValue(new Error('fail'));
    vi.mocked(AsyncStorage.setItem).mockResolvedValue(undefined);
    await secureStorage.setItem('k1', 'val');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('k1', 'val');
  });

  it('ignores errors if both fail on setItem', async () => {
    vi.mocked(SecureStore.setItemAsync).mockRejectedValue(new Error('fail'));
    vi.mocked(AsyncStorage.setItem).mockRejectedValue(new Error('fail2'));
    await secureStorage.setItem('k1', 'val');
  });

  it('removes item in SecureStore', async () => {
    vi.mocked(SecureStore.deleteItemAsync).mockResolvedValue(undefined);
    await secureStorage.removeItem('k1');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('k1');
  });

  it('falls back to AsyncStorage if SecureStore fails on removeItem', async () => {
    vi.mocked(SecureStore.deleteItemAsync).mockRejectedValue(new Error('fail'));
    vi.mocked(AsyncStorage.removeItem).mockResolvedValue(undefined);
    await secureStorage.removeItem('k1');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('k1');
  });

  it('ignores errors if both fail on removeItem', async () => {
    vi.mocked(SecureStore.deleteItemAsync).mockRejectedValue(new Error('fail'));
    vi.mocked(AsyncStorage.removeItem).mockRejectedValue(new Error('fail2'));
    await secureStorage.removeItem('k1');
  });
});
