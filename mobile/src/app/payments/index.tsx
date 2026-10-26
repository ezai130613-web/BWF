import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { PayeeDetails, PaymentRow, PaymentsResponse } from '@contract';
import { Badge, Body, Button, Card, Divider, EmptyState, ListRow, Screen, SectionTitle, Segmented, StatGrid, StatTile } from '@/components/ui';
import { PaymentMonthGrid } from '@/components/payment-month-grid';
import { formatDate, formatInr } from '@/lib/format';
import { useApi } from '@/lib/use-api';
import { colors, space } from '@/theme';

const STATUS: Record<PaymentRow['status'], { label: string; tone: 'warning' | 'success' | 'danger' | 'info' }> = {
  PENDING_APPROVAL: { label: 'Pending approval', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  CLARIFICATION_REQUESTED: { label: 'Clarification requested', tone: 'info' },
};

const standing = (s: 'APPROVED' | 'PENDING' | null) => (s === 'APPROVED' ? 'Paid' : s === 'PENDING' ? 'Pending' : 'Not paid');

export default function PaymentsScreen() {
  const { data, error, loading, refreshing, refresh } = useApi<PaymentsResponse>('/payments');
  const [type, setType] = useState<'MEETING' | 'MEMBERSHIP'>('MEETING');

  return (
    <Screen loading={loading} error={error} refreshing={refreshing} onRefresh={refresh}>
      {data ? (
        <>
          <StatGrid>
            <StatTile label={`Meeting fee · ${data.thisMonth.label}`} value={standing(data.thisMonth.status)} icon="calendar-outline" />
            <StatTile label="Meeting fee paid through" value={data.paidThrough ?? '—'} icon="time-outline" />
            <StatTile label={`Membership · ${data.membership.year}`} value={standing(data.membership.status)} icon="ribbon-outline" />
          </StatGrid>

          {data.monthGrid ? (
            <Card title="Meeting fee — month by month" icon="calendar-outline">
              <PaymentMonthGrid tiles={data.monthGrid} />
              <Body muted style={{ marginTop: space.md, fontSize: 13 }}>
                A month gets its tick once BWF approves the payment covering it. “No record” means nothing was submitted in the app or website for that month — payments made before the website aren’t shown.
              </Body>
            </Card>
          ) : null}

          <Segmented
            options={[
              { value: 'MEETING', label: 'Meeting fee (monthly)' },
              { value: 'MEMBERSHIP', label: 'Annual membership' },
            ]}
            value={type}
            onChange={setType}
          />

          <Card title="How to pay" icon="cash-outline">
            {(type === 'MEETING' ? data.fees.monthlyMeeting : data.fees.annualMembership) ? (
              <Body>
                Fee: <Text style={{ fontWeight: '700' }}>{type === 'MEETING' ? data.fees.monthlyMeeting : data.fees.annualMembership}</Text>
              </Body>
            ) : null}
            <Payee details={type === 'MEETING' ? data.meetingPayee : data.membershipPayee} />
            <Button
              label="I've paid — submit proof"
              icon="cloud-upload-outline"
              style={{ marginTop: space.lg }}
              disabled={!data.uploadsEnabled}
              onPress={() => router.push({ pathname: '/payments/new', params: { type } })}
            />
            {!data.uploadsEnabled ? <Body muted>Uploads are switched off right now — BWF will confirm payments directly.</Body> : null}
          </Card>

          <SectionTitle>Your payments</SectionTitle>
          <Card>
            {data.payments.length === 0 ? (
              <EmptyState icon="wallet-outline" message="No payments submitted yet." />
            ) : (
              data.payments.map((p, i) => (
                <Fragment key={p.id}>
                  {i > 0 ? <Divider /> : null}
                  <ListRow
                    title={`${formatInr(p.amountInr)} · ${p.coverageLabel}`}
                    subtitle={[p.meetingTitle ? `At check-in: ${p.meetingTitle}` : null, p.reviewRemarks ? `BWF: ${p.reviewRemarks}` : null].filter(Boolean).join('\n') || null}
                    meta={`Paid ${formatDate(p.actualPaymentDate)}`}
                    right={<Badge label={STATUS[p.status].label} tone={STATUS[p.status].tone} />}
                  />
                </Fragment>
              ))
            )}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function Payee({ details }: { details: PayeeDetails }) {
  const rows = [
    ['Account name', details.accountName],
    ['Account number', details.accountNumber],
    ['IFSC', details.ifsc],
    ['Bank', details.bankName],
    ['UPI ID', details.upiId],
  ].filter((r): r is [string, string] => Boolean(r[1]));

  if (!details.qrCodeUrl && rows.length === 0) return <Body muted>Payment details will be shared by BWF.</Body>;
  return (
    <View style={{ marginTop: space.md }}>
      {details.qrCodeUrl ? (
        <Image source={{ uri: details.qrCodeUrl }} style={{ width: 200, height: 200, alignSelf: 'center', marginBottom: space.md }} contentFit="contain" alt="UPI payment QR code" />
      ) : null}
      {rows.map(([label, value]) => (
        <Pressable
          key={label}
          onLongPress={() => Clipboard.setStringAsync(value)}
          accessibilityHint="Long-press to copy"
          style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: space.md }}>
          <Text style={{ color: colors.textMuted }}>{label}</Text>
          <Text selectable style={{ color: colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>
            {value}
          </Text>
        </Pressable>
      ))}
      {rows.length ? <Text style={{ color: colors.textFaint, fontSize: 12, marginTop: 4 }}>Long-press a detail to copy it.</Text> : null}
    </View>
  );
}
