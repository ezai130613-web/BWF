import { Fragment } from 'react';
import { Text, View } from 'react-native';

import type { PointsResponse } from '@contract';
import { Body, Card, Divider, ListRow, Notice, Screen } from '@/components/ui';
import { formatInr } from '@/lib/format';
import { useApi } from '@/lib/use-api';
import { colors } from '@/theme';

export default function PointsScreen() {
  const { data, error, loading, refreshing, refresh } = useApi<PointsResponse>('/points');
  const allZero = data?.breakdown.every((r) => r.pointsEach === 0);

  return (
    <Screen loading={loading} error={error} refreshing={refreshing} onRefresh={refresh}>
      {data ? (
        <>
          <Card style={{ alignItems: 'center', backgroundColor: colors.primaryDark, borderColor: colors.primaryDark }}>
            <Text style={{ color: colors.goldLight, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 }}>OVERALL BWF SCORE</Text>
            <Text style={{ color: '#fff', fontSize: 48, fontWeight: '700' }}>{data.total}</Text>
          </Card>
          {allZero ? <Notice tone="info" message="BWF hasn't set point values yet, so every activity currently scores 0. Your activity is still being counted." /> : null}
          <Card title="How your score adds up" icon="calculator-outline">
            {data.breakdown.map((r, i) => (
              <Fragment key={r.type}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  title={r.label}
                  subtitle={`${r.type === 'THANK_YOU_SLIP' ? `${r.count} slips · ${formatInr(r.quantity)}` : r.count} · ${r.rule}`}
                  right={<Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{r.subtotal}</Text>}
                />
              </Fragment>
            ))}
          </Card>
          <View>
            <Body muted>Scores are recalculated live from your recorded activity.</Body>
          </View>
        </>
      ) : null}
    </Screen>
  );
}
