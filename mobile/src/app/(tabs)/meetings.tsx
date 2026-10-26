import { router } from 'expo-router';
import { Fragment } from 'react';

import type { MeetingsResponse } from '@contract';
import { MeetingCard } from '@/components/meeting-card';
import { Button, Card, Divider, EmptyState, ListRow, Screen, SectionTitle } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/use-api';

export default function MeetingsScreen() {
  const { data, error, loading, refreshing, refresh } = useApi<MeetingsResponse>('/meetings');

  return (
    <Screen loading={loading} error={error} refreshing={refreshing} onRefresh={refresh}>
      <Button label="Scan meeting QR to check in" icon="qr-code-outline" onPress={() => router.push('/scan')} style={{ marginBottom: 16 }} />
      <SectionTitle>Upcoming · times are IST</SectionTitle>
      {data && data.upcoming.length === 0 ? (
        <Card>
          <EmptyState icon="calendar-outline" message="No upcoming meetings scheduled yet." />
        </Card>
      ) : null}
      {data?.upcoming.map((m, i) => <MeetingCard key={m.id} meeting={m} highlight={i === 0} />)}

      {data && data.recent.length > 0 ? (
        <>
          <SectionTitle>Recent</SectionTitle>
          <Card>
            {data.recent.map((m, i) => (
              <Fragment key={m.id}>
                {i > 0 ? <Divider /> : null}
                <ListRow title={m.title} meta={`${formatDate(m.startsAt)}${m.status === 'CANCELLED' ? ' · Cancelled' : ''}`} />
              </Fragment>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
