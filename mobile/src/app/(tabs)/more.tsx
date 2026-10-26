import { router, type Href } from 'expo-router';
import { Fragment, useState } from 'react';
import { Alert, Linking, Platform, Text } from 'react-native';

import { Body, Button, Card, Divider, ListRow, Screen, SectionTitle, type IconName } from '@/components/ui';
import { APP_VERSION, SITE_URL } from '@/lib/config';
import { useSession } from '@/lib/session';
import { colors } from '@/theme';

const LINKS: { href: Href; title: string; subtitle: string; icon: IconName }[] = [
  { href: '/points', title: 'My Points', subtitle: 'Score & breakdown', icon: 'trophy-outline' },
  { href: '/reports', title: 'My Activity', subtitle: 'This week, 6 / 12 months, overall', icon: 'bar-chart-outline' },
  { href: '/detailed-reports', title: 'Detailed Reports', subtitle: 'Exactly who, what and when', icon: 'document-text-outline' },
  { href: '/payments', title: 'Payments', subtitle: 'Meeting fee & membership', icon: 'wallet-outline' },
  { href: '/profile', title: 'My Profile', subtitle: 'View and request changes', icon: 'person-circle-outline' },
];

function confirm(title: string, message: string, action: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

export default function MoreScreen() {
  const { account, signOut } = useSession();
  const [busy, setBusy] = useState(false);

  return (
    <Screen>
      <Card>
        {LINKS.map((l, i) => (
          <Fragment key={l.title}>
            {i > 0 ? <Divider /> : null}
            <ListRow icon={l.icon} title={l.title} subtitle={l.subtitle} onPress={() => router.push(l.href)} />
          </Fragment>
        ))}
      </Card>

      <SectionTitle>Account</SectionTitle>
      <Card>
        <Body>{account?.member?.name}</Body>
        <Body muted>{[account?.username, account?.email].filter(Boolean).join(' · ')}</Body>
        <Button
          label="Sign out"
          variant="secondary"
          loading={busy}
          style={{ marginTop: 16 }}
          onPress={() =>
            confirm('Sign out?', 'You will need your password to sign in again on this phone.', 'Sign out', async () => {
              setBusy(true);
              await signOut();
            })
          }
        />
        <Button
          label="Sign out of all devices"
          variant="danger"
          style={{ marginTop: 12 }}
          onPress={() =>
            confirm(
              'Sign out everywhere?',
              'Lost a phone or signed in on a shared computer? This signs you out of the app and the website on every device, including this one.',
              'Sign out everywhere',
              async () => {
                setBusy(true);
                await signOut({ everywhere: true });
              },
            )
          }
        />
      </Card>

      <SectionTitle>Help</SectionTitle>
      <Card>
        <ListRow icon="globe-outline" title="Open the BWF website" onPress={() => Linking.openURL(SITE_URL)} />
        <Divider />
        <ListRow icon="shield-checkmark-outline" title="Privacy Policy" onPress={() => Linking.openURL(`${SITE_URL}/privacy`)} />
        <Divider />
        <ListRow icon="document-outline" title="Terms & Conditions" onPress={() => Linking.openURL(`${SITE_URL}/terms`)} />
      </Card>
      <Text style={{ textAlign: 'center', color: colors.textFaint, fontSize: 12 }}>BWF app {APP_VERSION}</Text>
    </Screen>
  );
}
