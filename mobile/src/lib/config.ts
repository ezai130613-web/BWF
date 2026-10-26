import * as Application from 'expo-application';
import { Platform } from 'react-native';

/**
 * The BWF website the app talks to. Set per EAS build profile in eas.json
 * (production → the live site). Use the www host: the bare domain 308-redirects
 * there, and a cross-host redirect can drop the Authorization header; for local development put
 * EXPO_PUBLIC_API_URL=http://<your-computer's-LAN-IP>:3000 in mobile/.env.local
 * so a phone on the same Wi-Fi can reach `npm run dev`.
 */
export const SITE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://www.buildersworldforum.com').replace(/\/$/, '');
export const API_URL = `${SITE_URL}/api/mobile/v1`;

export const APP_VERSION = Application.nativeApplicationVersion ?? 'dev';
export const PLATFORM = Platform.OS;
