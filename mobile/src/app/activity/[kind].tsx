import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Fragment } from 'react';
import { Text } from 'react-native';

import { Body, Button, Card, Divider, EmptyState, ListRow, Screen, SectionTitle, styles } from '@/components/ui';
import { findActivityKind } from '@/lib/activities';
import { useApi } from '@/lib/use-api';
import { colors } from '@/theme';

/** History for one activity type, with its "record" button. */
export default function ActivityListScreen() {
  const { kind: key } = useLocalSearchParams<{ kind: string }>();
  const kind = findActivityKind(key);
  const { data, error, loading, refreshing, refresh } = useApi<unknown>(kind ? kind.endpoint : null);

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
