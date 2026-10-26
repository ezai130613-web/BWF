import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Button, Card, Notice } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import { colors, space } from '@/theme';

/** Signed in, but the account couldn't be loaded (offline at launch) or has no member profile linked. */
export default function UnavailableScreen() {
  const { account, refreshAccount, signOut } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const noMember = account && !account.member;

  async function retry() {
    setBusy(true);
    setError(null);
    try {
      await refreshAccount();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
      <View style={{ padding: space.xl }}>
        {error ? <Notice tone="danger" message={error} /> : null}
        <Card>
          <Body>
            {noMember
              ? "Your login isn't linked to a BWF member profile. Please contact BWF."
              : "We couldn't reach BWF. Check your internet connection and try again."}
          </Body>
        </Card>
        {noMember ? null : <Button label="Try again" onPress={retry} loading={busy} style={{ marginBottom: space.md }} />}
        <Button label="Sign out" variant="secondary" onPress={() => signOut()} />
      </View>
    </SafeAreaView>
  );
}
