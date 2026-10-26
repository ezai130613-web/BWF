import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { SessionProvider, useSession } from '@/lib/session';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </SessionProvider>
  );
}

/**
 * Which part of the app is reachable is decided here, from the session:
 * signed out → sign-in screens; temporary credentials → activation only;
 * signed in → everything else. Protected routes are a UI convenience — the
 * API enforces the same rules on every request.
 */
function RootNavigator() {
  const { isLoading, token, account } = useSession();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;

  const signedOut = !token;
  const activating = Boolean(token && account?.mustActivate);
  const ready = Boolean(token && account && !account.mustActivate && account.member);
  // Signed in but we couldn't load the account (offline at launch), or the
  // login has no member profile linked.
  const unavailable = Boolean(token) && !activating && !ready;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primaryDark },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Protected guard={signedOut}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ title: 'Reset password' }} />
      </Stack.Protected>

      <Stack.Protected guard={activating}>
        <Stack.Screen name="activate" options={{ title: 'Activate your account' }} />
      </Stack.Protected>

      <Stack.Protected guard={unavailable}>
        <Stack.Screen name="unavailable" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={ready}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="activity/[kind]" options={{ title: '' }} />
        <Stack.Screen name="record/[kind]" options={{ title: '', presentation: 'modal' }} />
        <Stack.Screen name="points" options={{ title: 'My Points' }} />
        <Stack.Screen name="reports" options={{ title: 'My Activity' }} />
        <Stack.Screen name="detailed-reports" options={{ title: 'Detailed Reports' }} />
        <Stack.Screen name="payments/index" options={{ title: 'Payments' }} />
        <Stack.Screen name="payments/new" options={{ title: 'Submit payment', presentation: 'modal' }} />
        <Stack.Screen name="profile/index" options={{ title: 'My Profile' }} />
        <Stack.Screen name="profile/edit" options={{ title: 'Request profile edit', presentation: 'modal' }} />
        <Stack.Screen name="scan" options={{ title: 'Scan meeting QR' }} />
        <Stack.Screen name="checkin/[token]" options={{ title: 'Meeting check-in' }} />
      </Stack.Protected>
    </Stack>
  );
}
