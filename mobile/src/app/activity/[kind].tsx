import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Fragment, useState } from 'react';
import { Alert, Text } from 'react-native';

import { Body, Button, Card, Divider, EmptyState, ListRow, Screen, SectionTitle, styles } from '@/components/ui';
import { findActivityKind } from '@/lib/activities';
import { downloadAndShareImage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { colors } from '@/theme';

/** History for one activity type, with its "record" button. */
export default function ActivityListScreen() {
  const { kind: key } = useLocalSearchParams<{ kind: string }>();
  const kind = findActivityKind(key);
  const { data, error, loading, refreshing, refresh } = useApi<unknown>(kind ? kind.endpoint : null);
  const [downloading, setDownloading] = useState<string | null>(null);

  async function downloadBadge(slipId: string) {
    setDownloading(slipId);
    try {
      const shared = await downloadAndShareImage(`/thank-you-slips/${slipId}/image`, `bwf-thank-you-${slipId}.png`);
      if (!shared) Alert.alert('Not available', "Sharing isn't available on this device.");
    } catch (e) {
      Alert.alert('Download failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setDownloading(null);
    }
  }

  if (!kind) return <Screen error="Unknown activity." />;
  const sections = data ? kind.sections(data) : [];

  return (
    <>
      <Stack.Screen options={{ title: kind.title }} />
      <Screen loading={loading} error={error} refreshing={refreshing} onRefresh={refresh}>
        <Card>
          <Body muted>{kind.description}</Body>
          <Button
            label={kind.recordLabel}
            icon="add"
            onPress={() => router.push({ pathname: '/record/[kind]', params: { kind: kind.key } })}
            style={{ marginTop: 16 }}
          />
        </Card>
        {sections.map((section) => (
          <Fragment key={section.title}>
            <SectionTitle>{section.title}</SectionTitle>
            <Card>
              {section.summary ? <Text style={[styles.cardTitle, { color: colors.primary, marginBottom: 4 }]}>{section.summary}</Text> : null}
              {section.rows.length === 0 ? (
                <EmptyState message="Nothing recorded yet." />
              ) : (
                section.rows.map((row, i) => (
                  <Fragment key={row.key}>
                    {i > 0 ? <Divider /> : null}
                    <ListRow title={row.title} subtitle={row.subtitle} meta={row.meta} />
                    {row.badgeSlipId ? (
                      <Button
                        label="Download badge image"
                        variant="secondary"
                        loading={downloading === row.badgeSlipId}
                        icon="download-outline"
                        onPress={() => downloadBadge(row.badgeSlipId!)}
                        style={{ marginBottom: 8 }}
                      />
                    ) : null}
                  </Fragment>
                ))
              )}
            </Card>
          </Fragment>
        ))}
      </Screen>
    </>
  );
}
