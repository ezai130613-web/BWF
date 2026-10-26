import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { ThankYouSlipsResponse } from '@contract';
import { MemberPickerModal, usePickerMembers } from '@/components/member-picker';
import { Body, Button, Field, Notice, Screen, Segmented, SelectField, styles as ui } from '@/components/ui';
import { findActivityKind, type FieldDef } from '@/lib/activities';
import { api, errorMessage } from '@/lib/api';
import { goBack } from '@/lib/navigation';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/use-api';
import { colors, radius, space } from '@/theme';

/** One form for every activity type, driven by its field list in lib/activities.ts. */
export default function RecordActivityScreen() {
  const { kind: key } = useLocalSearchParams<{ kind: string }>();
  const kind = findActivityKind(key);
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [pickerFor, setPickerFor] = useState<FieldDef | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { members } = usePickerMembers();
  const needsReferrals = kind?.fields.some((f) => f.type === 'referral');
  const slips = useApi<ThankYouSlipsResponse>(needsReferrals ? '/thank-you-slips' : null);

  const memberName = useMemo(() => new Map((members ?? []).map((m) => [m.id, `${m.name} — ${m.company}`])), [members]);

  if (!kind) return <Screen error="Unknown activity." />;

  const set = (name: string, value: string | string[]) => setValues((v) => ({ ...v, [name]: value }));
  const str = (name: string) => (typeof values[name] === 'string' ? (values[name] as string) : '');
  const list = (name: string) => (Array.isArray(values[name]) ? (values[name] as string[]) : []);

  async function submit() {
    if (!kind) return;
    for (const f of kind.fields) {
      if ('required' in f && f.required && !str(f.name).trim()) {
        setError(`${f.label.replace(/ \(.*\)$/, '')} is required.`);
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      await api.post(kind.endpoint, values);
      goBack();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: kind.recordLabel }} />
      <Screen>
        {error ? <Notice tone="danger" message={error} /> : null}
        <Body muted style={{ marginBottom: space.lg }}>
          {kind.description}
        </Body>

        {kind.fields.map((f) => {
          switch (f.type) {
            case 'member':
              return (
                <SelectField
                  key={f.name}
                  label={f.label}
                  value={memberName.get(str(f.name))}
                  placeholder="Choose chapter → category → member"
                  onPress={() => setPickerFor(f)}
                />
              );
            case 'members': {
              const ids = list(f.name);
              return (
                <View key={f.name} style={{ marginBottom: space.lg }}>
                  <SelectField
                    label={f.label}
                    value={ids.length ? `${ids.length} selected` : null}
                    placeholder="Choose members"
                    onPress={() => setPickerFor(f)}
                  />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: -space.sm }}>
                    {ids.map((id) => (
                      <Pressable
                        key={id}
                        onPress={() => set(f.name, ids.filter((x) => x !== id))}
                        accessibilityLabel={`Remove ${memberName.get(id) ?? 'member'}`}
                        style={{ backgroundColor: colors.primarySoft, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 6 }}>
                        <Text style={{ color: colors.primary, fontWeight: '600' }}>{(memberName.get(id) ?? '').split(' — ')[0]} ✕</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              );
            }
            case 'choice':
              return (
                <View key={f.name}>
                  <Text style={ui.label}>{f.label}</Text>
                  <Segmented options={f.options} value={str(f.name)} onChange={(v) => set(f.name, v)} />
                </View>
              );
            case 'referral': {
              const referrals = slips.data?.linkableReferrals ?? [];
              if (referrals.length === 0) return null;
              return (
                <View key={f.name} style={{ marginBottom: space.lg }}>
                  <Text style={ui.label}>{f.label}</Text>
                  {[{ id: '', fromMemberName: 'Not linked to a referral', createdAt: '' }, ...referrals.slice(0, 10)].map((r) => {
                    const active = str(f.name) === r.id;
                    return (
                      <Pressable
                        key={r.id || 'none'}
                        onPress={() => set(f.name, r.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                        style={[ui.input, { marginBottom: space.sm, borderColor: active ? colors.primary : '#d4d4d4', backgroundColor: active ? colors.primarySoft : colors.surface }]}>
                        <Text style={{ color: colors.text, fontSize: 15 }}>
                          {r.id ? `From ${r.fromMemberName} · ${formatDate(r.createdAt)}` : r.fromMemberName}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              );
            }
            case 'amount':
              return <Field key={f.name} label={f.label} value={str(f.name)} onChangeText={(v) => set(f.name, v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" hint={f.hint} />;
            case 'phone':
              return <Field key={f.name} label={f.label} value={str(f.name)} onChangeText={(v) => set(f.name, v)} keyboardType="phone-pad" />;
            case 'multiline':
              return <Field key={f.name} label={f.label} value={str(f.name)} onChangeText={(v) => set(f.name, v)} multiline hint={f.hint} />;
            default:
              return <Field key={f.name} label={f.label} value={str(f.name)} onChangeText={(v) => set(f.name, v)} hint={f.hint} />;
          }
        })}

        <Button label="Save" onPress={submit} loading={saving} />
      </Screen>

      <MemberPickerModal
        visible={pickerFor !== null}
        multiple={pickerFor?.type === 'members'}
        selected={pickerFor ? (pickerFor.type === 'members' ? list(pickerFor.name) : str(pickerFor.name) ? [str(pickerFor.name)] : []) : []}
        onClose={() => setPickerFor(null)}
        onChange={(ids) => pickerFor && set(pickerFor.name, pickerFor.type === 'members' ? ids : (ids[0] ?? ''))}
      />
    </>
  );
}
