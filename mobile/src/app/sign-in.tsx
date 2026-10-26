import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import logo from '../../assets/images/bwf-logo.png';
import { Button, Field, Notice } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import { colors, radius, space } from '@/theme';

export default function SignInScreen() {
  const { signIn } = useSession();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!identifier.trim() || !password) {
      setError('Enter your username or email and your password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(identifier.trim(), password);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.bg}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Image source={logo} style={styles.logo} contentFit="contain" alt="Builders World Forum" />
            <Text style={styles.kicker}>BUILDERS WORLD FORUM</Text>
            <Text style={styles.title}>Member sign in</Text>
          </View>

          <View style={styles.card}>
            {error ? <Notice tone="danger" message={error} /> : null}
            <Field
              label="Username or email"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            <Button label="Sign in" onPress={submit} loading={busy} />
            <Link href="/forgot-password" style={styles.link}>
              Forgot your password?
            </Link>
          </View>

          <Text style={styles.footer}>
            Your login is issued by BWF. First time? Sign in with the username and temporary password you were given.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.primaryDark },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: space.xl },
  brand: { alignItems: 'center', marginBottom: space.xl },
  logo: { width: 88, height: 88, marginBottom: space.md },
  kicker: { color: colors.goldLight, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  title: { color: colors.ivory, fontSize: 28, fontWeight: '700', marginTop: space.xs },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: space.xl },
  link: { color: colors.primary, fontWeight: '600', textAlign: 'center', marginTop: space.lg, fontSize: 15 },
  footer: { color: 'rgba(244,238,225,0.75)', textAlign: 'center', marginTop: space.xl, fontSize: 13, lineHeight: 19 },
});
