import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, StyleSheet, Text, View } from 'react-native';

import type { MeetingSummary } from '@contract';
import { Card, styles as ui } from '@/components/ui';
import { dayAndMonth, formatDateTime } from '@/lib/format';
import { colors, radius, space } from '@/theme';

export function MeetingCard({ meeting, highlight }: { meeting: MeetingSummary; highlight?: boolean }) {
  const { day, month } = dayAndMonth(meeting.startsAt);
  const place = [meeting.venue, meeting.address].filter(Boolean).join(', ') || 'Venue to be confirmed';
  const guest = meeting.chiefGuest ? [meeting.chiefGuest.name, meeting.chiefGuest.designation, meeting.chiefGuest.company].filter(Boolean).join(', ') : 'Not announced yet';

  return (
    <Card style={highlight ? { borderColor: colors.primary, borderWidth: 1 } : undefined}>
      <View style={[ui.row, { gap: space.md, alignItems: 'flex-start' }]}>
        <View style={styles.date}>
          <Text style={styles.month}>{month}</Text>
          <Text style={styles.day}>{day}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{meeting.title}</Text>
          <Text style={styles.line}>{formatDateTime(meeting.startsAt)} IST</Text>
        </View>
      </View>
      <View style={[ui.row, styles.detail]}>
        <Ionicons name="location-outline" size={16} color={colors.textMuted} />
        <Text style={styles.detailText}>
          {place}
          {meeting.googleMapsUrl ? (
            <Text style={styles.link} onPress={() => Linking.openURL(meeting.googleMapsUrl!)}>
              {'  '}Map
            </Text>
          ) : null}
        </Text>
      </View>
      <View style={[ui.row, styles.detail]}>
        <Ionicons name="ribbon-outline" size={16} color={colors.textMuted} />
        <Text style={styles.detailText}>Chief Guest: {guest}</Text>
      </View>
      {meeting.agenda ? <Text style={[styles.detailText, { marginTop: space.sm, marginLeft: 0 }]}>{meeting.agenda}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  date: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  month: { color: colors.goldLight, fontSize: 11, fontWeight: '700' },
  day: { color: '#fff', fontSize: 22, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  line: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  detail: { marginTop: space.md, alignItems: 'flex-start' },
  detailText: { fontSize: 14, color: colors.textMuted, flex: 1, marginLeft: space.sm, lineHeight: 20 },
  link: { color: colors.primary, fontWeight: '700' },
});
