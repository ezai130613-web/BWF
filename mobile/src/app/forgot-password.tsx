import { useState } from 'react';

import { Body, Button, Card, Field, Notice, Screen } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { goBack } from '@/lib/navigation';

/**
 * Two steps, using the website's existing member reset endpoints: email a
 * 6-digit code, then set a new password with it. Resetting signs the member
 * out everywhere (web and app), same as on the website.
 */
export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode() {
    setBusy(true);
    setError(null);
    try {
      await api.postSite('/api/member/auth/request-password-reset', { email: email.trim() });
      setStep('code');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.postSite('/api/member/auth/reset-password', { email: email.trim(), code: code.trim(), password });
      setStep('done');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      {error ? <Notice tone="danger" message={error} /> : null}
      {step === 'email' ? (
        <Card>
          <Body muted style={{ marginBottom: 16 }}>
            Enter the email address on your BWF login. If it matches an account, we&apos;ll email you a 6-digit code.
          </Body>
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Button label="Send code" onPress={requestCode} loading={busy} disabled={!email.trim()} />
        </Card>
      ) : null}
      {step === 'code' ? (
        <Card>
          <Notice tone="info" message={`If ${email.trim()} has a BWF login, a code is on its way. It expires in 10 minutes.`} />
          <Field label="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} />
          <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" hint="At least 4 characters." />
          <Field label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
          <Button label="Set new password" onPress={reset} loading={busy} disabled={!code.trim() || !password} />
        </Card>
      ) : null}
      {step === 'done' ? (
        <Card>
          <Notice tone="success" message="Your password has been changed. Sign in with your new password." />
          <Button label="Back to sign in" onPress={() => goBack('/sign-in')} />
        </Card>
      ) : null}
    </Screen>
  );
}
