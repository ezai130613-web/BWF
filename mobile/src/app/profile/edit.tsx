import { useState } from 'react';

import type { ProfileFieldKey, ProfileResponse } from '@contract';
import { Body, Button, Field, Notice, Screen } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { goBack } from '@/lib/navigation';
import { useApi } from '@/lib/use-api';
import { space } from '@/theme';

const MULTILINE = new Set<ProfileFieldKey>(['bio', 'services', 'specialisations', 'usp', 'majorProjects', 'clientele', 'address', 'certifications', 'areasServed']);
const KEYBOARD: Partial<Record<ProfileFieldKey, 'email-address' | 'phone-pad' | 'url' | 'number-pad'>> = {
  email: 'email-address',
  phone: 'phone-pad',
  whatsapp: 'phone-pad',
  website: 'url',
  instagramUrl: 'url',
  linkedinUrl: 'url',
  facebookUrl: 'url',
  youtubeUrl: 'url',
  yearsInBusiness: 'number-pad',
};

/** Proposes changes — BWF reviews them before anything goes public (nothing is edited directly). */
export default function EditProfileScreen() {
  const { data } = useApi<ProfileResponse>('/profile');
  return <Screen loading={!data}>{data ? <EditForm profile={data} /> : null}</Screen>;
}

function EditForm({ profile }: { profile: ProfileResponse }) {
  const [fields, setFields] = useState<Record<string, string>>({ ...profile.fields });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await api.post('/profile', { fields });
      goBack('/profile');
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <>
      <Body muted style={{ marginBottom: space.lg }}>
        Edit what you&apos;d like changed. BWF reviews your request before it goes live.
      </Body>
      {error ? <Notice tone="danger" message={error} /> : null}
      {(Object.keys(profile.fields) as ProfileFieldKey[]).map((k) => (
        <Field
          key={k}
          label={profile.labels[k]}
          value={fields[k] ?? ''}
          onChangeText={(v) => setFields((f) => ({ ...f, [k]: v }))}
          multiline={MULTILINE.has(k)}
          keyboardType={KEYBOARD[k]}
          autoCapitalize={KEYBOARD[k] && KEYBOARD[k] !== 'phone-pad' ? 'none' : undefined}
        />
      ))}
      <Button label="Send for review" onPress={submit} loading={saving} />
    </>
  );
}
