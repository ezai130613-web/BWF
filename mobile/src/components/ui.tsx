import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Scrollable page body with pull-to-refresh, loading and error states. */
export function Screen({
  children,
  loading,
  error,
  refreshing,
  onRefresh,
  padded = true,
  safeTop = false,
}: {
  children?: ReactNode;
  loading?: boolean;
  error?: string | null;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  safeTop?: boolean;
}) {
  const body = (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[padded && styles.screenPad]}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}>
      {error ? <Notice tone="danger" message={error} action={onRefresh ? { label: 'Try again', onPress: onRefresh } : undefined} /> : null}
      {loading ? <ActivityIndicator style={{ marginTop: space.xxl }} color={colors.primary} /> : children}
    </ScrollView>
  );
  return safeTop ? <SafeAreaView style={styles.screen} edges={['top']}>{body}</SafeAreaView> : body;
}

export function Card({ children, title, icon, style, right }: { children: ReactNode; title?: string; icon?: IconName; style?: ViewStyle; right?: ReactNode }) {
  return (
    <View style={[styles.card, style]}>
      {title ? (
        <View style={styles.cardHeader}>
          <View style={styles.row}>
            {icon ? <Ionicons name={icon} size={18} color={colors.primary} style={{ marginRight: space.sm }} /> : null}
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: object }) {
  return <Text style={[styles.body, muted && { color: colors.textMuted }, style]}>{children}</Text>;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: ViewStyle;
};

export function Button({ label, onPress, variant = 'primary', loading, disabled, icon, style }: ButtonProps) {
  const palette = {
    primary: { bg: colors.primary, fg: '#fff', border: colors.primary },
    secondary: { bg: colors.surface, fg: colors.primary, border: colors.primaryBorder },
    danger: { bg: colors.surface, fg: colors.danger, border: '#fecaca' },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  }[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: inactive ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={18} color={palette.fg} style={{ marginRight: space.sm }} /> : null}
          <Text style={[styles.buttonLabel, { color: palette.fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field({ label, hint, error, ...input }: TextInputProps & { label: string; hint?: string; error?: string | null }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textFaint}
        accessibilityLabel={label}
        {...input}
        style={[styles.input, input.multiline && { minHeight: 96, textAlignVertical: 'top' }, error ? { borderColor: colors.danger } : null]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** A tappable select-style field (opens a picker elsewhere). */
export function SelectField({ label, value, placeholder, onPress }: { label: string; value?: string | null; placeholder: string; onPress: () => void }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value || placeholder}`} style={[styles.input, styles.rowBetween]}>
        <Text style={{ color: value ? colors.text : colors.textFaint, fontSize: 16, flex: 1 }} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && { backgroundColor: colors.primary }]}>
            <Text style={[styles.segmentLabel, active && { color: '#fff' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StatTile({ label, value, icon }: { label: string; value: string | number; icon?: IconName }) {
  return (
    <View style={styles.stat}>
      {icon ? <Ionicons name={icon} size={18} color={colors.primary} /> : null}
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <View style={styles.statGrid}>{children}</View>;
}

export function ListRow({
  title,
  subtitle,
  meta,
  icon,
  onPress,
  right,
}: {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  icon?: IconName;
  onPress?: () => void;
  right?: ReactNode;
}) {
  const content = (
    <View style={styles.listRow}>
      {icon ? (
        <View style={styles.listIcon}>
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.listTitle}>{title}</Text>
        {subtitle ? <Text style={styles.listSubtitle}>{subtitle}</Text> : null}
        {meta ? <Text style={styles.listMeta}>{meta}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textFaint} /> : null)}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && { opacity: 0.6 }}>
      {content}
    </Pressable>
  ) : (
    content
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function EmptyState({ message, icon = 'file-tray-outline' }: { message: string; icon?: IconName }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={32} color={colors.textFaint} />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

const TONES = {
  danger: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle' as IconName },
  warning: { bg: colors.warningSoft, fg: colors.warning, icon: 'time-outline' as IconName },
  success: { bg: colors.primarySoft, fg: colors.primary, icon: 'checkmark-circle' as IconName },
  info: { bg: colors.infoSoft, fg: colors.info, icon: 'information-circle' as IconName },
};

export function Notice({ tone, message, action }: { tone: keyof typeof TONES; message: string; action?: { label: string; onPress: () => void } }) {
  const t = TONES[tone];
  return (
    <View style={[styles.notice, { backgroundColor: t.bg }]} accessibilityRole={tone === 'danger' ? 'alert' : undefined}>
      <Ionicons name={t.icon} size={18} color={t.fg} style={{ marginRight: space.sm, marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.fg, fontSize: 14, lineHeight: 20 }}>{message}</Text>
        {action ? (
          <Text onPress={action.onPress} style={{ color: t.fg, fontWeight: '700', marginTop: space.xs }}>
            {action.label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function Badge({ label, tone = 'success' }: { label: string; tone?: keyof typeof TONES }) {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={{ color: t.fg, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenPad: { padding: space.lg, paddingBottom: space.xxl * 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space.lg,
    marginBottom: space.lg,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: space.sm, marginTop: space.sm },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  button: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center' },
  buttonLabel: { fontSize: 16, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: space.xs + 2 },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: space.xs },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#d4d4d4',
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  segmented: { flexDirection: 'row', backgroundColor: '#ececea', borderRadius: radius.md, padding: 3, marginBottom: space.lg },
  segment: { flex: 1, paddingVertical: space.sm + 2, borderRadius: radius.sm, alignItems: 'center' },
  segmentLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginBottom: space.lg },
  stat: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space.md,
    gap: space.xs,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, gap: space.md },
  listIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  listTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  listSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  listMeta: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  empty: { alignItems: 'center', paddingVertical: space.xl, gap: space.sm },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  notice: { flexDirection: 'row', borderRadius: radius.md, padding: space.md, marginBottom: space.lg },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: space.sm + 2, paddingVertical: 3 },
});
