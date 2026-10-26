import { router } from 'expo-router';
import { Fragment } from 'react';

import { Body, Button, Card, Divider, ListRow, Screen, SectionTitle } from '@/components/ui';
import { ACTIVITY_KINDS } from '@/lib/activities';

/** Record-and-review hub for the seven self-reported activities. */
export default function ActivityScreen() {
  return (
    <Screen>
      <Card>
        <Body muted>Record what you did — it counts towards your BWF Score straight away. Tap a type to see your history.</Body>
        <Button label="Give a referral" icon="add" onPress={() => router.push('/record/referrals')} style={{ marginTop: 16 }} />
      </Card>
      <SectionTitle>Your activity</SectionTitle>
      <Card>
        {ACTIVITY_KINDS.map((kind, i) => (
          <Fragment key={kind.key}>
            {i > 0 ? <Divider /> : null}
            <ListRow
              icon={kind.icon}
              title={kind.title}
              subtitle={kind.recordLabel}
              onPress={() => router.push({ pathname: '/activity/[kind]', params: { kind: kind.key } })}
            />
          </Fragment>
        ))}
      </Card>
    </Screen>
  );
}
