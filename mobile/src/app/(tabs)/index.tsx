import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { DashboardResponse } from '@contract';
import { Card, Notice, Screen, SectionTitle, StatGrid, StatTile, type IconName } from '@/components/ui';
import { MeetingCard } from '@/components/meeting-card';
import { formatDate, formatInr } from '@/lib/format';
import { useSession } from '@/lib/session';
import { useApi } from '@/lib/use-api';
import { colors, radius, space } from '@/theme';

const QUICK_ACTIONS: { href: Href; label: string; icon: IconName }[] = [
  { href: '/record/referrals', label: 'Give Referral', icon: 'git-network-outline' },
  { href: '/record/thank-you-slips', label: 'Thank You Slip', icon: 'receipt-outline' },
  { href: '/record/one-to-ones', label: 'Record 1-to-1', icon: 'people-outline' },
  { href: '/record/power-dates', label: 'Power Date', icon: 'rocket-outline' },
  { href: '/scan', label: 'Scan to check in', icon: 'qr-code-outline' },
  { href: '/payments', label: 'Payments', icon: 'wallet-outline' },
];

export default function HomeScreen() {
  const { account } = useSession();
  const { data, error, loading, refreshing, refresh } = useApi<DashboardResponse>('/dashboard');
  const member = account?.member;
  const firstName = (member?.name ?? account?.name ?? '').split(' ')[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <View style={styles.heroInner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>WELCOME BACK</Text>
            <Text style={styles.name}>{firstName}</Text>
            <Text style={styles.meta} numberOfLines={2}>
              {[member?.category, member?.chapter, member?.company].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/points')} style={styles.score} accessibilityRole="button" accessibilityLabel={`Overall BWF score ${data?.score ?? ''}`}>
            <Ionicons name="trophy" size={22} color={colors.gold} />
            <Text style={styles.scoreValue}>{data ? data.score : '—'}</Text>
            <Text style={styles.scoreLabel}>BWF Score</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <Screen loading={loading} error={error} refreshing={refreshing} onRefresh={refresh}>
        <View style={styles.actions}>
          {QUICK_ACTIONS.map((a) => (
            <Pressable key={a.label} onPress={() => router.push(a.href)} accessibilityRole="button" style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}>
              <View style={styles.actionIcon}>
                <Ionicons name={a.icon} size={22} color={colors.goldLight} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        {data ? (
          <>
            {data.birthdaysToday && data.birthdaysToday.length > 0 ? (
              <Pressable onPress={() => router.push('/socials')} accessibilityRole="button" style={({ pressed }) => [styles.birthdays, pressed && { opacity: 0.8 }]}>
                <Text style={styles.birthdaysText}>
                  🎂 <Text style={{ fontWeight: '700' }}>Birthday{data.birthdaysToday.length > 1 ? 's' : ''} today: </Text>
                  {data.birthdaysToday.map((b) => (b.isMe ? 'you! Happy birthday' : b.name)).join(', ')}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.warning} />
              </Pressable>
            ) : null}

            {data.pendingProfileEdit ? (
              <Notice tone="warning" message={`Your profile edit request (sent ${formatDate(data.pendingProfileEdit.submittedAt)}) is awaiting BWF review.`} />
            ) : null}

            <SectionTitle>This month · {data.monthLabel}</SectionTitle>
            <StatGrid>
              <StatTile label="Referrals given" value={data.thisMonth.referralsGiven} icon="git-network-outline" />
              <StatTile label="Referrals received" value={data.thisMonth.referralsReceived} icon="git-network-outline" />
              <StatTile label="Business received" value={formatInr(data.thisMonth.businessReceivedInr)} icon="cash-outline" />
              <StatTile label="Business given" value={formatInr(data.thisMonth.businessGivenInr)} icon="cash-outline" />
              <StatTile label="One-to-ones" value={data.thisMonth.oneToOnes} icon="people-outline" />
              <StatTile label="Power dates" value={data.thisMonth.powerDates} icon="rocket-outline" />
            </StatGrid>

            <SectionTitle>Next chapter meeting</SectionTitle>
            {data.nextMeeting ? (
              <MeetingCard meeting={data.nextMeeting} highlight />
            ) : (
              <Card>
                <Text style={{ color: colors.textMuted }}>No upcoming meeting scheduled yet.</Text>
              </Card>
            )}
          </>
        ) : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primaryDark, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  heroInner: { flexDirection: 'row', alignItems: 'flex-end', padding: space.xl, paddingTop: space.lg, gap: space.lg },
  kicker: { color: colors.gold, fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  name: { color: colors.ivory, fontSize: 30, fontWeight: '700', marginTop: 2 },
  meta: { color: 'rgba(244,238,225,0.8)', fontSize: 13, marginTop: space.xs },
  score: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.lg, paddingVertical: space.md, paddingHorizontal: space.lg },
  scoreValue: { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: 2 },
  scoreLabel: { color: 'rgba(244,238,225,0.75)', fontSize: 11 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginBottom: space.lg },
  action: {
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    alignItems: 'center',
    gap: space.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  actionIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'center' },
  birthdays: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.warningSoft,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.lg,
  },
  birthdaysText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
});
