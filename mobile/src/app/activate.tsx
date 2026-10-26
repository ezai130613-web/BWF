import { useState } from 'react';

import type { LoginResponse } from '@contract';
import { Body, Button, Card, Field, Notice, Screen } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';

/**
 * First sign-in with BWF-issued temporary credentials — same rules as the
 * website's /member/activate: choose a username (for BWFCC… logins), confirm
 * an email (with a code when BWF requires it) and set a private password.
 */
export default function ActivateScreen() {
  const { account, adopt, signOut } = useSession();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!account) return null;
  const needsCode = account.activationRequiresEmailCode;

  async function sendCode() {
    setSending(true);
    setError(null);
    try {
      await api.post('/auth/activation/code', { email: email.trim() });
      setInfo(`We sent a 6-digit code to ${email.trim()}. It expires in 10 minutes.`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  async function complete() {
    setSaving(true);
    setError(null);
    try {
      const response = await api.post<LoginResponse>('/auth/activation/complete', {
        username: account?.mustChooseUsername ? username.trim() : undefined,
        email: email.trim(),
        code: needsCode ? code.trim() : undefined,
        password,
        confirmPassword: confirm,
      });
      await adopt(response);
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Card>
        <Body>
          Welcome, {account.member?.name ?? account.name}. You signed in with a temporary password.{' '}
          {account.mustChooseUsername ? 'Choose your own username, add' : 'Add'} your email
          {needsCode ? " (we'll send a code to confirm it)" : ''} and choose a private password to continue.
        </Body>
      </Card>
      {error ? <Notice tone="danger" message={error} /> : null}
      {info ? <Notice tone="success" message={info} /> : null}
      <Card>
        {account.mustChooseUsername ? (
          <Field
            label="Choose a username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            hint="4–30 letters, numbers, . _ or -, starting with a letter."
          />
        ) : null}
        <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        {needsCode ? (
          <>
            <Button label={info ? 'Send a new code' : 'Send code'} variant="secondary" onPress={sendCode} loading={sending} disabled={!email.trim()} style={{ marginBottom: 16 }} />
            <Field label="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} />
          </>
        ) : null}
        <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" hint="At least 4 characters — not your temporary password." />
        <Field label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
        <Button label="Activate my account" onPress={complete} loading={saving} disabled={!email.trim() || !password || (needsCode && !code.trim())} />
      </Card>
      <Button label="Sign out" variant="ghost" onPress={() => signOut()} />
    </Screen>
  );
}
