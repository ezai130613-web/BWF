import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import type { PaymentMonthTile } from '@contract';
import { colors, radius, space } from '@/theme';

const LABEL: Record<PaymentMonthTile['status'], string> = { PAID: 'Paid', PENDING: 'Awaiting approval', DUE: 'Not paid', NO_RECORD: 'No record', UPCOMING: 'Upcoming' };

/** Phase 40 — month-by-month meeting-fee status; a tick for each month BWF has approved. Same data as the website. */
export function PaymentMonthGrid({ tiles }: { tiles: PaymentMonthTile[] }) {
  return (
    <View style={styles.grid}>
      {tiles.map((t) => (
        <View
          key={`${t.year}-${t.month}`}
          accessible
          accessibilityLabel={`${t.label}: ${LABEL[t.status]}`}
          style={[
            styles.tile,
            t.status === 'PAID' && { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
            t.status === 'PENDING' && { backgroundColor: colors.warningSoft, borderColor: '#fcd34d' },
            t.status === 'NO_RECORD' && { backgroundColor: colors.background },
            t.current && { borderColor: colors.primary, borderWidth: 2 },
          ]}>
          <Text style={styles.month}>{t.label}</Text>
          {t.status === 'PAID' ? (
            <View style={[styles.dot, { backgroundColor: colors.primary }]}>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </View>
          ) : t.status === 'PENDING' ? (
            <View style={[styles.dot, { backgroundColor: '#f59e0b' }]}>
              <Ionicons name="time-outline" size={15} color="#fff" />
            </View>
          ) : (
            <View style={[styles.dot, styles.empty, { borderColor: t.status === 'DUE' ? '#fca5a5' : colors.border }]} />
          )}
          <Text
            style={[
              styles.status,
              { color: t.status === 'PAID' ? colors.primary : t.status === 'PENDING' ? colors.warning : t.status === 'DUE' ? colors.danger : colors.textFaint },
            ]}>
            {LABEL[t.status]}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  month: { fontSize: 12, fontWeight: '700', color: colors.text },
  dot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  empty: { borderWidth: 2, borderStyle: 'dashed' },
  status: { fontSize: 11, textAlign: 'center' },
});
