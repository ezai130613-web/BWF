import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BirthdayUpdateRequest, BirthdayUpdateResponse, SocialsResponse } from '@contract';
import { Body, Button, Card, Field, Notice, Screen } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { MONTH_NAMES } from '@/lib/birthday';
import { goBack } from '@/lib/navigation';
import { useApi } from '@/lib/use-api';
import { colors, radius, space } from '@/theme';

/** Phase 37 — set or clear your own birthday. Saved straight away (no review); others see day + month only. */
export default function BirthdayScreen() {
  const { data, error: loadError, loading } = useApi<SocialsResponse>('/socials');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filled, setFilled] = useState(false);

  // Fill the form once with the saved birthday.
  useEffect(() => {
    if (!data || filled) return;
    setFilled(true);
    if (data.myBirthday) {
      setDay(String(data.myBirthday.day));
      setMonth(data.myBirthday.month);
      setYear(data.myBirthday.year ? String(data.myBirthday.year) : '');
    }
  }, [data, filled]);

  async function save(body: BirthdayUpdateRequest) {
    setBusy(true);
    setError(null);
    try {
      await api.post<BirthdayUpdateResponse>('/profile/birthday', body);
      goBack('/socials');
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Screen loading={loading} error={loadError}>
      <Card>
        <Body muted>Fellow members see the day and month on Socials — never the year.</Body>
      </Card>
      <Card>
        <Field label="Day" value={day} onChangeText={(t) => setDay(t.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" placeholder="e.g. 14" />
        <Text style={styles.label}>Month</Text>
        <View style={styles.months}>
          {MONTH_NAMES.map((name, i) => {
            const active = month === i + 1;
            return (
              <Pressable
                key={name}
                onPress={() => setMonth(i + 1)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={name}
                style={[styles.monthChip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                <Text style={[styles.monthText, active && { color: '#fff' }]}>{name.slice(0, 3)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Field
          label="Year (optional)"
          hint="Only you and BWF admins see this."
          value={year}
          onChangeText={(t) => setYear(t.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          placeholder="e.g. 1985"
        />
        {error ? <Notice tone="danger" message={error} /> : null}
        <Button
          label="Save birthday"
          loading={busy}
          disabled={!day || !month}
          onPress={() => save({ day: Number(day), month, year: year ? Number(year) : null })}
        />
        {data?.myBirthday ? (
          <Button label="Remove my birthday" variant="ghost" style={{ marginTop: space.sm }} disabled={busy} onPress={() => save({ day: null, month: null, year: null })} />
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: space.xs + 2 },
  months: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg },
  monthChip: { width: '22%', flexGrow: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  monthText: { fontSize: 14, fontWeight: '600', color: colors.text },
});
