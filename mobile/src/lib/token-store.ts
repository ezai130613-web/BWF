import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Where the sign-in token is kept: the iOS Keychain / Android Keystore via
 * expo-secure-store on phones. SecureStore has no web implementation, so the
 * web build (used only for development previews) falls back to localStorage,
 * same as Expo Router's own authentication guide.
 */
const isWeb = Platform.OS === 'web';

export const tokenStore = {
  get: (key: string): Promise<string | null> =>
    isWeb ? Promise.resolve(globalThis.localStorage?.getItem(key) ?? null) : SecureStore.getItemAsync(key),
  set: (key: string, value: string): Promise<void> =>
    isWeb ? Promise.resolve(globalThis.localStorage?.setItem(key, value)) : SecureStore.setItemAsync(key, value),
  remove: (key: string): Promise<void> =>
    isWeb ? Promise.resolve(globalThis.localStorage?.removeItem(key)) : SecureStore.deleteItemAsync(key),
};
