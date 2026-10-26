import { Fragment, useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';

import type { DetailedReportResponse } from '@contract';
import { Card, Divider, EmptyState, ListRow, Screen } from '@/components/ui';
import { useApi } from '@/lib/use-api';
import { colors, space } from '@/theme';

/** Same 11 tables as the website's Detailed Reports, shown as rows: first column as the title, the rest beneath it. */
export default function DetailedReportsScreen() {
  const [tab, setTab] = useState('referrals-given');
  const { data, error, refreshing, refresh } = useApi<DetailedReportResponse>(`/detailed-reports?tab=${tab}`);
  const current = data?.tab === tab ? data : null;

  return (
    <Screen error={error} refreshing={refreshing} onRefresh={refresh}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: space.lg }} contentContainerStyle={{ gap: space.sm }}>
        {(data?.tabs ?? [{ key: 'referrals-given', label: 'RFLs Given' }]).map((t) => {
          const active = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={{ backgroundColor: active ? colors.primary : '#ececea', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
              <Text style={{ color: active ? '#fff' : colors.textMuted, fontWeight: '600', fontSize: 13 }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {current ? (
        <Card>
          {current.rows.length === 0 ? (
            <EmptyState message="Nothing here yet." />
          ) : (
            current.rows.map((row, i) => (
              <Fragment key={row.key}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  title={row.cells[0] ?? ''}
                  subtitle={row.cells
                    .slice(1, -1)
                    .map((c, j) => `${current.columns[j + 1]}: ${c}`)
                    .join('\n')}
                  meta={row.cells[row.cells.length - 1]}
                />
              </Fragment>
            ))
          )}
        </Card>
      ) : null}
    </Screen>
  );
}
