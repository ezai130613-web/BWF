import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Fragment } from 'react';
import { Linking, Text, View } from 'react-native';

import type { ProfileFieldKey, ProfileResponse } from '@contract';
import { Body, Button, Card, Divider, ListRow, Notice, Screen } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/use-api';
import { colors, space } from '@/theme';

export default function ProfileScreen() {
  const { data, error, loading, refreshing, refresh } = useApi<ProfileResponse>('/profile');

  return (
    <Screen loading={loading} error={error} refreshing={refreshing} onRefresh={refresh}>
      {data ? (
        <>
          <Card style={{ alignItems: 'center' }}>
            {data.member.photoUrl ? (
              <Image source={{ uri: data.member.photoUrl }} style={{ width: 88, height: 88, borderRadius: 44, marginBottom: space.md }} contentFit="cover" alt="" />
            ) : null}
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{data.member.name}</Text>
            <Body muted>{[data.member.designation, data.member.company].filter(Boolean).join(', ')}</Body>
            <Body muted>
              {data.member.category} · {data.member.chapter}
            </Body>
            <Button label="View public profile" variant="ghost" icon="open-outline" onPress={() => Linking.openURL(data.member.profileUrl)} />
          </Card>

          {data.pendingEdit ? (
            <Notice
              tone="warning"
              message={`Your edit request from ${formatDate(data.pendingEdit.submittedAt)} is awaiting BWF review. You can send another once it's been reviewed.`}
            />
          ) : (
            <Button label="Request a change" icon="create-outline" onPress={() => router.push('/profile/edit')} style={{ marginBottom: space.lg }} />
          )}

          <Card title="Profile details" icon="person-outline">
            {(Object.keys(data.fields) as ProfileFieldKey[])
              .filter((k) => data.fields[k])
              .map((k, i) => (
                <Fragment key={k}>
                  {i > 0 ? <Divider /> : null}
                  <ListRow title={data.labels[k]} subtitle={data.fields[k]} />
                </Fragment>
              ))}
          </Card>
          <View>
            <Body muted>Changes are reviewed by BWF before they appear on your public profile. Photos, brochure and map location can be updated on the website.</Body>
          </View>
        </>
      ) : null}
    </Screen>
  );
}
