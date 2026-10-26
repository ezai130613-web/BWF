import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { NearbyMember, NearbySearchResponse } from '@contract';
import { Body, Button, Card, EmptyState, Field, Notice, Screen, Segmented } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDistance } from '@/lib/format';
import { colors, radius, space } from '@/theme';

const RADII = ['2', '5', '10', '25'] as const;

/**
 * Members within a radius of where you are now (the phone's own location —
 * no Maps key needed), nearest first; or a name/area search.
 */
export default function NearbyScreen() {
  const [radius_, setRadius] = useState<(typeof RADII)[number]>('5');
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('');
  const [result, setResult] = useState<NearbySearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'location' | 'search' | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Collapsed by default so "Members near me" results show without scrolling.
  const [showSearch, setShowSearch] = useState(false);

  async function run(params: Record<string, string>, mode: 'location' | 'search') {
    setBusy(mode);
    setError(null);
    try {
      const qs = new URLSearchParams({ radius: radius_, ...params }).toString();
      setResult(await api.get<NearbySearchResponse>(`/members/nearby?${qs}`));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function useMyLocation() {
    setError(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Location permission is off. Allow it in Settings, or search by area below.');
      return;
    }
    setBusy('location');
    try {
      const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000, requiredAccuracy: 500 });
      const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(here);
      await run({ lat: String(here.lat), lng: String(here.lng), q: query.trim() }, 'location');
    } catch {
      setError("Couldn't get your location. Try again outdoors, or search by area below.");
      setBusy(null);
    }
  }

  function changeRadius(r: (typeof RADII)[number]) {
    setRadius(r);
    if (coords) void run({ lat: String(coords.lat), lng: String(coords.lng), q: query.trim(), radius: r }, 'location');
  }

  return (
    <Screen>
      <Card>
        <Body muted>In an area with time to spare? See every BWF member near you — nearest first — so you can drop in and meet.</Body>
        <View style={{ height: space.md }} />
        <Segmented options={RADII.map((r) => ({ value: r, label: `${r} km` }))} value={radius_} onChange={changeRadius} />
        <Button label="Members near me" icon="navigate" onPress={useMyLocation} loading={busy === 'location'} />
      </Card>

      {!showSearch ? (
        <Button label="Search by name or area instead" variant="ghost" icon="search" onPress={() => setShowSearch(true)} style={{ marginBottom: space.md }} />
      ) : (
        <Card title="Search by name or area" icon="search">
          <Field label="Name or company" value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search" />
          <Field label="Area (matches saved addresses)" value={area} onChangeText={setArea} placeholder="e.g. Anna Nagar" returnKeyType="search" />
          <Button
            label="Search"
            variant="secondary"
            onPress={() => {
              setCoords(null);
              void run({ q: query.trim(), place: area.trim() }, 'search');
            }}
            loading={busy === 'search'}
            disabled={!query.trim() && !area.trim()}
          />
        </Card>
      )}

      {error ? <Notice tone="danger" message={error} /> : null}

      {result ? (
        <>
          <Text style={styles.count}>
            {result.total} member{result.total === 1 ? '' : 's'}
            {result.mode === 'radius' ? ` within ${result.radiusKm} km` : result.mode === 'text' && area ? ` matching “${area}”` : ''}
          </Text>
          {result.mode === 'radius' && result.withoutLocation > 0 ? (
            <Notice tone="info" message={`${result.withoutLocation} member${result.withoutLocation === 1 ? " hasn't" : "s haven't"} set a business location yet and can't appear in distance results.`} />
          ) : null}
          {result.members.length === 0 ? (
            <Card>
              <EmptyState icon="location-outline" message={result.mode === 'radius' ? 'No members within this distance. Try a wider radius.' : 'No members match your search.'} />
            </Card>
          ) : (
            result.members.map((m) => <MemberCard key={m.id} member={m} />)
          )}
        </>
      ) : null}
    </Screen>
  );
}

function MemberCard({ member: m }: { member: NearbyMember }) {
  const phone = m.whatsapp || m.phone;
  const actions = [
    m.phone ? { label: 'Call', icon: 'call-outline' as const, url: `tel:${m.phone}` } : null,
    phone ? { label: 'WhatsApp', icon: 'logo-whatsapp' as const, url: `https://wa.me/${phone.replace(/[^0-9]/g, '')}` } : null,
    m.latitude !== null && m.longitude !== null
      ? { label: 'Directions', icon: 'navigate-outline' as const, url: `https://www.google.com/maps/dir/?api=1&destination=${m.latitude},${m.longitude}` }
      : null,
    { label: 'Profile', icon: 'person-outline' as const, url: m.profileUrl },
  ].filter((a): a is NonNullable<typeof a> => a !== null);

  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        {m.photoUrl ? (
          <Image source={{ uri: m.photoUrl }} style={styles.avatar} contentFit="cover" alt="" />
        ) : (
          <View style={[styles.avatar, styles.initial]}>
            <Text style={styles.initialText}>{m.name.charAt(0)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
            <Text style={styles.name}>{m.name}</Text>
            {m.distanceKm !== null ? <Text style={styles.distance}>{formatDistance(m.distanceKm)}</Text> : null}
          </View>
          <Text style={styles.company}>{m.company}</Text>
          <Text style={styles.meta}>
            {m.category} | {m.chapter}
          </Text>
          {m.locality ? <Text style={styles.meta}>{m.locality}</Text> : null}
        </View>
      </View>
      <View style={styles.actions}>
        {actions.map((a) => (
          <Pressable key={a.label} onPress={() => Linking.openURL(a.url)} accessibilityRole="link" style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}>
            <Ionicons name={a.icon} size={16} color={colors.primary} />
            <Text style={styles.actionText}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  count: { fontSize: 14, color: colors.text, fontWeight: '600', marginBottom: space.md },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  initial: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  initialText: { fontSize: 20, fontWeight: '700', color: colors.primary },
  name: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  distance: { fontSize: 12, fontWeight: '700', color: '#fff', backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  company: { fontSize: 14, color: colors.text, marginTop: 2 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: 8 },
  actionText: { fontSize: 13, fontWeight: '600', color: colors.text },
});
