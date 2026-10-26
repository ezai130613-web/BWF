import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { PickerMember, PickerMembersResponse } from '@contract';
import { Button, Notice } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { colors, radius, space } from '@/theme';

/**
 * Chapter → Category → Member picker, same flow as the portal's
 * MemberPicker (Phase 30). Typing searches across everything at once.
 * `multiple` collects several members (Conclaves).
 */

let cache: PickerMember[] | null = null;

/** Called on sign-out — the list excludes the signed-in member, so it's per-user. */
export function clearPickerCache() {
  cache = null;
}

export function usePickerMembers() {
  const [members, setMembers] = useState<PickerMember[] | null>(cache);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (cache) return;
    api
      .get<PickerMembersResponse>('/members/picker')
      .then((r) => {
        cache = r.members;
        setMembers(r.members);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);
  return { members, error };
}

type Step = { level: 'chapter' } | { level: 'category'; chapterId: string } | { level: 'member'; chapterId: string; categoryId: string };

export function MemberPickerModal({
  visible,
  multiple,
  selected,
  onClose,
  onChange,
}: {
  visible: boolean;
  multiple?: boolean;
  selected: string[];
  onClose: () => void;
  onChange: (ids: string[]) => void;
}) {
  const { members, error } = usePickerMembers();
  const [step, setStep] = useState<Step>({ level: 'chapter' });
  const [query, setQuery] = useState('');

  // Reset on close, so the next open starts at "Choose a chapter".
  function close() {
    setStep({ level: 'chapter' });
    setQuery('');
    onClose();
  }

  const items = useMemo(() => {
    if (!members) return [];
    const q = query.trim().toLowerCase();
    if (q) {
      return members
        .filter((m) => `${m.name} ${m.company} ${m.categoryName} ${m.chapterName}`.toLowerCase().includes(q))
        .map((m) => ({ id: m.id, label: m.name, sub: `${m.company} · ${m.categoryName} · ${m.chapterName}`, member: true }));
    }
    if (step.level === 'chapter') {
      const map = new Map<string, { name: string; count: number }>();
      for (const m of members) map.set(m.chapterId, { name: m.chapterName, count: (map.get(m.chapterId)?.count ?? 0) + 1 });
      return [...map].map(([id, v]) => ({ id, label: v.name, sub: `${v.count} members`, member: false }));
    }
    if (step.level === 'category') {
      const map = new Map<string, { name: string; count: number }>();
      for (const m of members.filter((x) => x.chapterId === step.chapterId)) {
        map.set(m.categoryId, { name: m.categoryName, count: (map.get(m.categoryId)?.count ?? 0) + 1 });
      }
      return [...map].sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([id, v]) => ({ id, label: v.name, sub: `${v.count} member${v.count === 1 ? '' : 's'}`, member: false }));
    }
    return members
      .filter((m) => m.chapterId === step.chapterId && m.categoryId === step.categoryId)
      .map((m) => ({ id: m.id, label: m.name, sub: m.company, member: true }));
  }, [members, step, query]);

  function choose(item: { id: string; member: boolean }) {
    if (!item.member) {
      if (step.level === 'chapter') setStep({ level: 'category', chapterId: item.id });
      else if (step.level === 'category') setStep({ level: 'member', chapterId: step.chapterId, categoryId: item.id });
      return;
    }
    if (!multiple) {
      onChange([item.id]);
      close();
      return;
    }
    onChange(selected.includes(item.id) ? selected.filter((id) => id !== item.id) : [...selected, item.id]);
  }

  function back() {
    if (step.level === 'member') setStep({ level: 'category', chapterId: step.chapterId });
    else if (step.level === 'category') setStep({ level: 'chapter' });
  }

  const heading = query ? 'Search results' : step.level === 'chapter' ? 'Choose a chapter' : step.level === 'category' ? 'Choose a category' : 'Choose a member';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.header}>
          {step.level !== 'chapter' && !query ? (
            <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
              <Ionicons name="chevron-back" size={24} color={colors.primary} />
            </Pressable>
          ) : (
            <View style={{ width: 24 }} />
          )}
          <Text style={styles.heading}>{heading}</Text>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: space.lg }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, company or category"
            placeholderTextColor={colors.textFaint}
            style={styles.search}
            autoCorrect={false}
          />
          {error ? <Notice tone="danger" message={error} /> : null}
        </View>
        {!members && !error ? <ActivityIndicator style={{ marginTop: space.xl }} color={colors.primary} /> : null}
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl }}
          ListEmptyComponent={members ? <Text style={styles.empty}>Nothing matches.</Text> : undefined}
          renderItem={({ item }) => {
            const isSelected = item.member && selected.includes(item.id);
            return (
              <Pressable onPress={() => choose(item)} accessibilityRole="button" style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Text style={styles.itemSub}>{item.sub}</Text>
                </View>
                <Ionicons
                  name={item.member ? (isSelected ? 'checkmark-circle' : multiple ? 'ellipse-outline' : 'chevron-forward') : 'chevron-forward'}
                  size={22}
                  color={isSelected ? colors.primary : colors.textFaint}
                />
              </Pressable>
            );
          }}
        />
        {multiple ? (
          <View style={styles.footer}>
            <Button label={`Done (${selected.length} selected)`} onPress={close} />
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.lg },
  heading: { fontSize: 17, fontWeight: '700', color: colors.text },
  search: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    fontSize: 16,
    marginBottom: space.md,
    color: colors.text,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  itemLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  itemSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: space.xl },
  footer: { padding: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.surface },
});
