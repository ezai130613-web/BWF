import { useState } from 'react';

import type { ReportPeriod, ReportsResponse } from '@contract';
import { Screen, Segmented, StatGrid, StatTile } from '@/components/ui';
import { formatInr } from '@/lib/format';
import { useApi } from '@/lib/use-api';

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: '6mo', label: '6 Mo' },
  { value: '12mo', label: '12 Mo' },
  { value: 'overall', label: 'Overall' },
];

export default function ReportsScreen() {
  const [period, setPeriod] = useState<ReportPeriod>('week');
  const { data, error, loading, refreshing, refresh } = useApi<ReportsResponse>(`/reports?period=${period}`);
  const s = data?.period === period ? data.stats : null;

  return (
    <Screen error={error} refreshing={refreshing} onRefresh={refresh}>
      <Segmented options={PERIODS} value={period} onChange={setPeriod} />
      {loading || !s ? null : (
        <StatGrid>
          <StatTile label="Referrals given" value={s.referralsGiven} icon="git-network-outline" />
          <StatTile label="Referrals received" value={s.referralsReceived} icon="git-network-outline" />
          <StatTile label="Business received" value={formatInr(s.businessReceivedInr)} icon="cash-outline" />
          <StatTile label="Business given" value={formatInr(s.businessGivenInr)} icon="cash-outline" />
          <StatTile label="One-to-ones" value={s.oneToOnes} icon="people-outline" />
          <StatTile label="Power dates" value={s.powerDates} icon="rocket-outline" />
          <StatTile label="Conclaves" value={s.conclaves} icon="git-merge-outline" />
          <StatTile label="Visitors" value={s.visitors} icon="person-add-outline" />
          <StatTile label="Chief guests" value={s.chiefGuests} icon="ribbon-outline" />
          <StatTile label="Consumers" value={s.consumers} icon="home-outline" />
          <StatTile label="Inductions" value={s.inductions} icon="medal-outline" />
        </StatGrid>
      )}
    </Screen>
  );
}
