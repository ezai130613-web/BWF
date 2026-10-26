import * as Crypto from 'expo-crypto';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { PaymentsResponse } from '@contract';
import { ProofPicker } from '@/components/proof-picker';
import { Button, Field, Notice, Screen, Segmented, styles as ui } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { goBack } from '@/lib/navigation';
import { addMonths, monthLabel, type MonthYear } from '@/lib/months';
import { formatInr, todayIst } from '@/lib/format';
import { quoteMeetingFee } from '@/lib/fees';
import { useApi } from '@/lib/use-api';
import { colors, space } from '@/theme';

/** Submit a meeting-fee or membership payment for BWF approval (same fields as the website form). */
export default function NewPaymentScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const type = params.type === 'MEMBERSHIP' ? 'MEMBERSHIP' : 'MEETING';
  const { data } = useApi<PaymentsResponse>('/payments');
  // One key per attempt: a double-tap or a retry after a timeout can't create two payments.
  const idempotencyKey = useRef(Crypto.randomUUID()).current;

  const [months, setMonths] = useState(1);
  const [startOffset, setStartOffset] = useState(0);
  const [year, setYear] = useState<string | null>(null);
  // null = follow the calculated total; a string = what the member typed (it stays editable).
  const [typedAmount, setTypedAmount] = useState<string | null>(null);
  const [paidOn, setPaidOn] = useState(todayIst());
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const covered: MonthYear[] = useMemo(() => {
    if (!data) return [];
    const start = addMonths(data.nextUnpaidMonth, startOffset);
    return Array.from({ length: months }, (_, i) => addMonths(start, i));
  }, [data, months, startOffset]);
  const membershipYear = year ?? String(data?.defaultMembershipYear ?? '');
  const quote = type === 'MEETING' ? quoteMeetingFee(data?.feeQuote?.monthlyMeetingInr, months, data?.feeQuote?.gstPercent ?? 18) : null;
  const expected = type === 'MEETING' ? (quote?.total ?? null) : (data?.feeQuote?.membershipTotalInr ?? null);
  const amount = typedAmount ?? (expected ? String(expected) : '');

  async function submit() {
    if (!proofUrl) {
      setError('Upload the payment proof first.');
      return;
    }
    setSaving(true);
    setError(null);
    const body: Record<string, string | number> = { type, idempotencyKey, amountPaidInr: amount, actualPaymentDate: paidOn, proofUrl };
    if (type === 'MEETING') {
      body.numberOfMonths = months;
      covered.forEach((m, i) => {
        body[`month_${i}`] = m.month;
        body[`year_${i}`] = m.year;
      });
    } else {
      body.membershipYear = membershipYear;
    }
    try {
      await api.post('/payments', body);
      goBack('/payments');
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <Screen loading={!data}>
      {error ? <Notice tone="danger" message={error} /> : null}
      <Text style={[ui.cardTitle, { marginBottom: space.lg }]}>{type === 'MEETING' ? 'Meeting fee (monthly)' : 'Annual membership'}</Text>

      {type === 'MEETING' ? (
        <>
          <Text style={ui.label}>Number of months</Text>
          <Segmented options={['1', '2', '3', '6', '12'].map((n) => ({ value: n, label: n }))} value={String(months)} onChange={(v) => setMonths(Number(v))} />
          <Text style={ui.label}>Months covered</Text>
          <View style={[ui.rowBetween, { marginBottom: space.lg }]}>
            <Pressable onPress={() => setStartOffset((o) => o - 1)} accessibilityLabel="Start one month earlier" hitSlop={10}>
              <Text style={{ color: colors.primary, fontSize: 22, fontWeight: '700' }}>‹</Text>
            </Pressable>
            <Text style={{ flex: 1, textAlign: 'center', color: colors.text, fontSize: 15 }}>{covered.map(monthLabel).join(', ')}</Text>
            <Pressable onPress={() => setStartOffset((o) => o + 1)} accessibilityLabel="Start one month later" hitSlop={10}>
              <Text style={{ color: colors.primary, fontSize: 22, fontWeight: '700' }}>›</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Text style={ui.label}>Membership year</Text>
          <Segmented options={(data?.membershipYears ?? []).map((y) => ({ value: String(y), label: String(y) }))} value={membershipYear} onChange={setYear} />
        </>
      )}

      {quote ? (
        <Notice
          tone="success"
          message={`Amount to pay: ${formatInr(quote.total)}\n${quote.months} month${quote.months === 1 ? '' : 's'} × ${formatInr(quote.perMonth)} = ${formatInr(quote.subtotal)} + ${quote.gstPercent}% GST ${formatInr(quote.gst)}`}
        />
      ) : null}
      <Field
        label="Amount paid (₹)"
        value={amount}
        onChangeText={(v) => setTypedAmount(v.replace(/[^0-9.]/g, ''))}
        keyboardType="decimal-pad"
        hint={
          expected && typedAmount !== null && Number(typedAmount) !== expected
            ? `This differs from the calculated ${formatInr(expected)} — BWF will check it when approving.`
            : undefined
        }
      />
      <Field label="Date paid (YYYY-MM-DD)" value={paidOn} onChangeText={setPaidOn} autoCapitalize="none" keyboardType="numbers-and-punctuation" />
      <ProofPicker value={proofUrl} onUploaded={setProofUrl} />
      <Button label="Submit for approval" onPress={submit} loading={saving} disabled={!amount || !proofUrl} />
    </Screen>
  );
}
