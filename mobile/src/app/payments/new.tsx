import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { OnlinePaymentResponse, PaymentsResponse } from '@contract';
import { ProofPicker } from '@/components/proof-picker';
import { Button, Field, Notice, Screen, Segmented, styles as ui } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { goBack } from '@/lib/navigation';
import { formatDate, formatInr, todayIst } from '@/lib/format';
import { useApi } from '@/lib/use-api';
import { colors, radius, space } from '@/theme';

/**
 * Pay the meeting fee or membership (same rules as the website form).
 * The meeting fee is paid only as a package of 2, 6, 12 or 24 meetings —
 * there is no other way to pay it. Every price is shown before GST, as
 * "₹X + GST". With `onlinePayments` the member pays on Razorpay (opened in
 * the browser) instead of uploading proof.
 */
export default function NewPaymentScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const type = params.type === 'MEMBERSHIP' ? 'MEMBERSHIP' : 'MEETING';
  const { data } = useApi<PaymentsResponse>('/payments');
  // One key per attempt: a double-tap or a retry after a timeout can't create two payments.
  const idempotencyKey = useRef(Crypto.randomUUID()).current;

  const [packageSize, setPackageSize] = useState<number | null>(null);
  const [year, setYear] = useState<string | null>(null);
  // null = follow the calculated total; a string = what the member typed (it stays editable).
  const [typedAmount, setTypedAmount] = useState<string | null>(null);
  const [paidOn, setPaidOn] = useState(todayIst());
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const online = Boolean(data?.onlinePayments);
  const upcoming = data?.upcomingUnpaid ?? [];
  // Only packages the chapter has enough scheduled meetings for can be chosen.
  const packages = (data?.meetingPackages ?? []).filter((p) => p.meetings <= upcoming.length);
  const chosen = packages.find((p) => p.meetings === packageSize) ?? packages[0] ?? null;
  const meetingDates = chosen ? upcoming.slice(0, chosen.meetings) : [];
  const gstPercent = data?.feeQuote?.gstPercent ?? 18;
  const membershipYear = year ?? String(data?.defaultMembershipYear ?? '');

  // What's transferred (incl. GST) — pre-fills the "amount paid" field for proof uploads.
  const transferTotal = type === 'MEETING' ? (chosen?.totalInr ?? null) : (data?.feeQuote?.membershipTotalInr ?? null);
  const amount = typedAmount ?? (transferTotal ? String(transferTotal) : '');
  // The price as shown everywhere: before GST.
  const priceLabel =
    type === 'MEETING'
      ? chosen
        ? `${formatInr(chosen.priceInr)} + GST`
        : null
      : data?.feeQuote?.membershipFeeInr
        ? `${formatInr(data.feeQuote.membershipFeeInr)} + GST`
        : null;

  async function payOnline() {
    if (type === 'MEETING' && !chosen) return;
    setSaving(true);
    setError(null);
    try {
      const body = type === 'MEETING' ? { type, meetingsToPay: chosen!.meetings } : { type, membershipYear };
      const res = await api.post<OnlinePaymentResponse>('/payments/online', body);
      await Linking.openURL(res.url);
      goBack('/payments');
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  async function submit() {
    if (online) return payOnline();
    if (type === 'MEETING' && !chosen) return;
    if (!proofUrl) {
      setError('Upload the payment proof first.');
      return;
    }
    setSaving(true);
    setError(null);
    const body: Record<string, string | number> = { type, idempotencyKey, amountPaidInr: amount, actualPaymentDate: paidOn, proofUrl };
    if (type === 'MEETING') body.meetingsToPay = chosen!.meetings;
    else body.membershipYear = membershipYear;
    try {
      await api.post('/payments', body);
      goBack('/payments');
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  const blocked = type === 'MEETING' && !chosen;

  return (
    <Screen loading={!data}>
      {error ? <Notice tone="danger" message={error} /> : null}
      <Text style={[ui.cardTitle, { marginBottom: space.lg }]}>{type === 'MEETING' ? 'Meeting fee' : 'Annual membership'}</Text>

      {type === 'MEETING' ? (
        <>
          <Text style={ui.label}>How many meetings?</Text>
          {packages.length ? (
            <View style={{ gap: space.sm, marginBottom: space.lg }}>
              {packages.map((p) => {
                const active = p.meetings === chosen?.meetings;
                return (
                  <Pressable
                    key={p.meetings}
                    onPress={() => {
                      setPackageSize(p.meetings);
                      setTypedAmount(null);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: space.md,
                      paddingHorizontal: space.lg,
                      borderRadius: radius.md,
                      borderWidth: active ? 2 : 1,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primarySoft : colors.surface,
                    }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{p.meetings} meetings</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{formatInr(p.priceInr)} + GST</Text>
                      {p.discountInr ? (
                        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                          <Text style={{ textDecorationLine: 'line-through', color: colors.textFaint }}>{formatInr(p.originalInr)} + GST</Text> save{' '}
                          {formatInr(p.discountInr)}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: colors.danger, marginBottom: space.lg }}>
              Not enough upcoming meetings are scheduled for your chapter yet — please contact BWF.
            </Text>
          )}
          {chosen ? (
            <>
              <Text style={ui.label}>Meetings this pays for ({meetingDates.length})</Text>
              <View style={{ marginBottom: space.lg, gap: 2 }}>
                {meetingDates.map((d) => (
                  <Text key={d} style={{ color: colors.text, fontSize: 15 }}>
                    • {formatDate(d)}
                  </Text>
                ))}
              </View>
            </>
          ) : null}
        </>
      ) : (
        <>
          <Text style={ui.label}>Membership year</Text>
          <Segmented options={(data?.membershipYears ?? []).map((y) => ({ value: String(y), label: String(y) }))} value={membershipYear} onChange={setYear} />
        </>
      )}

      {type === 'MEETING' && chosen ? (
        <Notice
          tone="success"
          message={`Amount: ${formatInr(chosen.priceInr)} + GST\n${
            chosen.discountInr ? `${formatInr(chosen.originalInr)} − ${formatInr(chosen.discountInr)} discount = ${formatInr(chosen.priceInr)} + GST. ` : ''
          }${gstPercent}% GST is ${formatInr(chosen.gstInr)}, so you pay ${formatInr(chosen.totalInr)} in all.`}
        />
      ) : null}
      {online ? (
        <>
          <Button label={`Pay ${priceLabel ?? ''} on Razorpay`.replace('  ', ' ')} icon="card-outline" onPress={payOnline} loading={saving} disabled={blocked} />
          <Text style={{ color: colors.textFaint, fontSize: 12, marginTop: space.sm }}>
            Razorpay opens in your browser. When you’re done, come back and pull down on Payments to refresh.
          </Text>
        </>
      ) : (
        <>
          <Field
            label="Amount paid (₹, incl. GST)"
            value={amount}
            onChangeText={(v) => setTypedAmount(v.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            hint={
              transferTotal && typedAmount !== null && Number(typedAmount) !== transferTotal
                ? `This differs from ${priceLabel} (${formatInr(transferTotal)} with GST) — BWF will check it when approving.`
                : undefined
            }
          />
          <Field label="Date paid (YYYY-MM-DD)" value={paidOn} onChangeText={setPaidOn} autoCapitalize="none" keyboardType="numbers-and-punctuation" />
          <ProofPicker value={proofUrl} onUploaded={setProofUrl} />
          <Button label="Submit for approval" onPress={submit} loading={saving} disabled={blocked || !amount || !proofUrl} />
        </>
      )}
    </Screen>
  );
}
