import { useState } from 'react';

import { Body, Button, Card, Field, Notice, Screen } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { goBack } from '@/lib/navigation';
import { useSession } from '@/lib/session';
import { space } from '@/theme';

/**
 * Account deletion request (App Store guideline 5.1.1(v)). BWF memberships
 * carry payment and attendance records, so deletion is completed by BWF
 * after contacting the member, rather than instantly.
 */
export default function DeleteAccountScreen() {
  const { signOut } = useSession();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/account/deletion-request', { reason: reason.trim() || undefined });
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <Screen>
        <Notice tone="success" message="Request sent. BWF will contact you and delete your account and personal data within 30 days." />
        <Button label="Sign out now" variant="secondary" onPress={() => signOut()} style={{ marginBottom: space.md }} />
        <Button label="Back" variant="ghost" onPress={() => goBack('/more')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Body>
          This asks BWF to delete your member login and the personal data held about you. BWF will contact you to confirm, then complete
          it within 30 days. Records BWF must keep by law (for example, payment records) are retained only as long as required.
        </Body>
      </Card>
      {error ? <Notice tone="danger" message={error} /> : null}
      <Field label="Reason (optional)" value={reason} onChangeText={setReason} multiline />
      <Button label="Request account deletion" variant="danger" onPress={submit} loading={busy} />
    </Screen>
  );
}
