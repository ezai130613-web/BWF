import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Text } from 'react-native';

import type { CheckinPreviewResponse } from '@contract';
import { Body, Button, Card, Notice, Screen, styles as ui } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { goBack } from '@/lib/navigation';
import { formatDateTime } from '@/lib/format';
import { useApi } from '@/lib/use-api';
import { colors, space } from '@/theme';

/**
 * Confirms attendance for the scanned meeting. Phase 40 (client, 2026-10-26):
 * payments happen only on the Payments screen — check-in shows whether this
 * month is paid and links there if it isn't.
 */
export default function CheckinScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { data, error, loading } = useApi<CheckinPreviewResponse>(token ? `/checkin/${encodeURIComponent(token)}` : null);
  const idempotencyKey = useRef(Crypto.randomUUID()).current;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setSaving(true);
    setSubmitError(null);
    try {
      await api.post(`/checkin/${encodeURIComponent(token ?? '')}`, { idempotencyKey, madePayment: 'no' });
      setDone(true);
    } catch (e) {
      setSubmitError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const paymentNotice = data ? (
    data.monthCoverage === 'APPROVED' ? (
      <Notice tone="success" message={`Your ${data.monthLabel} meeting fee is paid.`} />
    ) : data.monthCoverage === 'PENDING' ? (
      <Notice tone="info" message={`Your ${data.monthLabel} payment is awaiting BWF approval.`} />
    ) : (
      <Notice
        tone="warning"
        message={`Your ${data.monthLabel} meeting fee isn't paid yet.`}
        action={{ label: 'Pay now →', onPress: () => router.push('/payments') }}
      />
    )
  ) : null;

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

          {paymentNotice}

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
              <Button label="Check me in" icon="checkmark-circle-outline" onPress={submit} loading={saving} />
            </Card>
          )}
        </>
      ) : null}
    </Screen>
  );
}
