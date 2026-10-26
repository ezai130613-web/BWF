import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { BirthdayRow, SocialsResponse } from '@contract';
import { Body, Button, Card, EmptyState, Screen, SectionTitle } from '@/components/ui';
import { formatBirthday } from '@/lib/birthday';
import { useApi } from '@/lib/use-api';
import { colors, radius, space } from '@/theme';

/** Phase 37 — fellow members' birthdays: today, the next 30 days, and the year by month. Day + month only. */
export default function SocialsScreen() {
  const { data, error, loading, refreshing, refresh } = useApi<SocialsResponse>('/socials');

  return (
    <Screen loading={loading} error={error} refreshing={refreshing} onRefresh={refresh}>
      {data ? (
        <>
          {!data.myBirthday ? (
            <Card>
              <Body>Add your birthday so fellow members can wish you. Only the day and month are shown.</Body>
              <Button label="Add my birthday" icon="gift-outline" variant="secondary" style={{ marginTop: space.md }} onPress={() => router.push('/profile/birthday')} />
            </Card>
          ) : null}

          <SectionTitle>Today</SectionTitle>
          {data.today.length > 0 ? (
            data.today.map((p) => <BirthdayCard key={p.id} person={p} highlight />)
          ) : (
            <Card>
              <EmptyState icon="gift-outline" message="No birthdays today." />
            </Card>
          )}

          <SectionTitle>Next {data.upcomingDays} days</SectionTitle>
          {data.upcoming.length > 0 ? (
            data.upcoming.map((p) => <BirthdayCard key={p.id} person={p} />)
          ) : (
            <Card>
              <EmptyState icon="calendar-outline" message={`No birthdays in the next ${data.upcomingDays} days.`} />
            </Card>
          )}

          {data.byMonth.length > 0 ? (
            <>
              <SectionTitle>All birthdays</SectionTitle>
              <Card>
                {data.byMonth.map((group, gi) => (
                  <View key={group.month} style={gi > 0 ? { marginTop: space.lg } : undefined}>
                    <Text style={styles.month}>{group.name}</Text>
                    {group.people.map((p) => (
                      <View key={p.id} style={styles.monthRow}>
                        <Text style={styles.monthName} numberOfLines={1}>
                          {p.name}
                          {p.isMe ? <Text style={{ color: colors.textFaint }}> (you)</Text> : null}
                        </Text>
                        <Text style={styles.monthDay}>{p.day}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          {data.myBirthday ? (
            <Button
              label={`Your birthday: ${formatBirthday(data.myBirthday.day, data.myBirthday.month)} · Change`}
              variant="ghost"
              icon="create-outline"
              onPress={() => router.push('/profile/birthday')}
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function whenLabel(daysAway: number) {
  if (daysAway === 0) return 'Today';
  if (daysAway === 1) return 'Tomorrow';
  return `In ${daysAway} days`;
}

function BirthdayCard({ person: p, highlight = false }: { person: BirthdayRow; highlight?: boolean }) {
  return (
    <Card style={highlight ? { borderColor: colors.gold, backgroundColor: '#fffaf0' } : undefined}>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        {p.photoUrl ? (
          <Image source={{ uri: p.photoUrl }} style={styles.avatar} contentFit="cover" alt="" />
        ) : (
          <View style={[styles.avatar, styles.initial]}>
            <Text style={styles.initialText}>{p.name.charAt(0)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {p.name}
            {p.isMe ? <Text style={{ fontWeight: '400', color: colors.textFaint }}> (you)</Text> : null}
          </Text>
          <Text style={styles.company}>{p.company}</Text>
          <Text style={styles.meta}>
            {p.category} | {p.chapter}
          </Text>
          <Text style={styles.when}>
            🎂 {p.label} · {whenLabel(p.daysAway)}
          </Text>
        </View>
      </View>
      {p.wishUrl ? (
        <Pressable
          onPress={() => Linking.openURL(p.wishUrl!)}
          accessibilityRole="link"
          accessibilityLabel={`Wish ${p.name} on WhatsApp`}
          style={({ pressed }) => [styles.wish, pressed && { opacity: 0.7 }]}>
          <Ionicons name="logo-whatsapp" size={16} color="#fff" />
          <Text style={styles.wishText}>Wish on WhatsApp</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 56, height: 56, borderRadius: 28 },
  initial: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  initialText: { fontSize: 20, fontWeight: '700', color: colors.primary },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  company: { fontSize: 14, color: colors.text, marginTop: 2 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  when: { fontSize: 13, fontWeight: '600', color: colors.primary, marginTop: space.xs },
  wish: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 8,
    marginTop: space.md,
  },
  wishText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  month: { fontSize: 12, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: space.xs },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md, paddingVertical: 4 },
  monthName: { flex: 1, fontSize: 14, color: colors.text },
  monthDay: { fontSize: 14, color: colors.textMuted },
});
