import * as Crypto from 'expo-crypto';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Text } from 'react-native';

import type { CheckinPreviewResponse } from '@contract';
import { ProofPicker } from '@/components/proof-picker';
import { Body, Button, Card, Field, Notice, Screen, Segmented, styles as ui } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { goBack } from '@/lib/navigation';
import { formatDateTime, todayIst } from '@/lib/format';
import { useApi } from '@/lib/use-api';
import { colors, space } from '@/theme';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Confirms attendance for the scanned meeting — optionally with this month's payment, like the website's check-in page. */
export default function CheckinScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { data, error, loading } = useApi<CheckinPreviewResponse>(token ? `/checkin/${encodeURIComponent(token)}` : null);
  const idempotencyKey = useRef(Crypto.randomUUID()).current;
  const [paid, setPaid] = useState<'no' | 'yes'>('no');
  const [amount, setAmount] = useState('');
  const [paidOn, setPaidOn] = useState(todayIst());
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // The meeting's month, as "October 2026" → { month: 10, year: 2026 }.
  const month = useMemo(() => {
    const [name, year] = (data?.monthLabel ?? '').split(' ');
    return { month: MONTHS.indexOf(name) + 1, year: Number(year) };
  }, [data]);
  const askPayment = data && data.monthCoverage === null;

  async function submit() {
    setSaving(true);
    setSubmitError(null);
    const body: Record<string, string | number> = { idempotencyKey, madePayment: askPayment ? paid : 'no' };
    if (askPayment && paid === 'yes') {
      Object.assign(body, { numberOfMonths: 1, month_0: month.month, year_0: month.year, amountPaidInr: amount, actualPaymentDate: paidOn, proofUrl: proofUrl ?? '' });
    }
    try {
      await api.post(`/checkin/${encodeURIComponent(token ?? '')}`, body);
      setDone(true);
    } catch (e) {
      setSubmitError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen loading={loading} error={error}>
      {data ? (
        <>
          <Card>
            <Text style={ui.cardTitle}>{data.meeting.title}</Text>
            <Body muted>
              {data.meeting.chapter} · {formatDateTime(data.meeting.startsAt)} IST
            </Body>
            <Text style={{ marginTop: space.md, color: colors.text }}>
              {data.member.name} · {data.member.category}
            </Text>
          </Card>

          {done || data.alreadyCheckedIn ? (
            <>
              <Notice tone="success" message={done ? "You're checked in. Welcome!" : "You're already checked in for this meeting."} />
              <Button label="Done" onPress={() => goBack()} />
            </>
          ) : !data.open ? (
            <Notice tone="warning" message="Check-in for this meeting isn't open right now." />
          ) : (
            <Card>
              {submitError ? <Notice tone="danger" message={submitError} /> : null}
              {data.monthCoverage === 'APPROVED' ? <Notice tone="success" message={`Your ${data.monthLabel} meeting fee is already paid.`} /> : null}
              {data.monthCoverage === 'PENDING' ? <Notice tone="info" message={`Your ${data.monthLabel} payment is awaiting BWF approval.`} /> : null}
              {askPayment ? (
                <>
                  <Text style={ui.label}>Did you pay the {data.monthLabel} meeting fee?</Text>
                  <Segmented
                    options={[
                      { value: 'no', label: 'Not now' },
                      { value: 'yes', label: 'Yes, I paid' },
                    ]}
                    value={paid}
                    onChange={setPaid}
                  />
                  {paid === 'yes' ? (
                    <>
                      <Field label="Amount paid (₹)" value={amount} onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
                      <Field label="Date paid (YYYY-MM-DD)" value={paidOn} onChangeText={setPaidOn} autoCapitalize="none" />
                      <ProofPicker value={proofUrl} onUploaded={setProofUrl} />
                    </>
                  ) : null}
                </>
              ) : null}
              <Button label="Check me in" icon="checkmark-circle-outline" onPress={submit} loading={saving} disabled={paid === 'yes' && askPayment === true && (!amount || !proofUrl)} />
            </Card>
          )}
        </>
      ) : null}
    </Screen>
  );
}
