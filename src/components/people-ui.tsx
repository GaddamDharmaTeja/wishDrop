import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/components/wishdrop-ui';
import { daysLabel, daysUntil, formatShort } from '@/lib/birthdays';
import { Person } from '@/lib/types';

const AVATAR_TINTS = ['#FFE8F2', '#EDE3FF', '#FFEBDD', '#E2F4FF', '#E6F7EC'];

function tintFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

export function Avatar({ name, uri, size = 44 }: Readonly<{ name: string; uri?: string; size?: number }>) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={shape} contentFit="cover" />;
  return (
    <View style={[styles.avatar, shape, { backgroundColor: tintFor(name) }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{name.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

export function ScreenHeader({
  title,
  right,
  onBack,
}: Readonly<{ title: string; right?: ReactNode; onBack?: () => void }>) {
  const goBack = () => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/home');
  };
  return (
    <View style={styles.header}>
      <Pressable onPress={goBack} hitSlop={12} style={styles.headerSide} accessibilityLabel="Go back">
        <Ionicons name="chevron-back" size={24} color={colors.ink} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

export type SegmentOption<K extends string> = { key: K; label: string };

export function SegmentTabs<K extends string>({
  options,
  value,
  onChange,
}: Readonly<{ options: readonly SegmentOption<K>[]; value: K; onChange: (key: K) => void }>) {
  return (
    <View style={styles.segments}>
      {options.map(option => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function RelationshipChip({ label }: Readonly<{ label: string }>) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

export function PersonRow({
  person,
  onPress,
  selected,
  right,
  showCountdown = true,
}: Readonly<{
  person: Person;
  onPress?: () => void;
  selected?: boolean;
  right?: ReactNode;
  showCountdown?: boolean;
}>) {
  const days = daysUntil(person.birthday);
  return (
    <Pressable onPress={onPress} style={[styles.row, selected && styles.rowSelected]}>
      {selected === undefined ? null : (
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={selected ? colors.pink : colors.line}
        />
      )}
      <Avatar name={person.name} uri={person.photoUri} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{person.name}</Text>
        <RelationshipChip label={person.relationship} />
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.rowDate}>{formatShort(person.birthday)}</Text>
        {showCountdown ? (
          <Text style={[styles.rowDays, days <= 1 && { color: colors.pink, fontWeight: '800' }]}>{daysLabel(days)}</Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

export function MenuRow({
  icon,
  label,
  onPress,
  highlighted,
  destructive,
}: Readonly<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  highlighted?: boolean;
  destructive?: boolean;
}>) {
  const tint = destructive ? '#D93636' : colors.ink;
  return (
    <Pressable onPress={onPress} style={[styles.menuRow, highlighted && styles.menuRowHighlighted]}>
      <Ionicons name={icon} size={20} color={highlighted ? colors.pink : tint} />
      <Text style={[styles.menuText, { color: tint }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

export function EmptyState({ emoji, title, copy }: Readonly<{ emoji: string; title: string; copy: string }>) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 40 }}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyCopy}>{copy}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.ink, fontWeight: '800' },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  headerSide: { width: 44, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: colors.ink, fontSize: 18, fontWeight: '800' },
  segments: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.line,
    marginVertical: 12,
  },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.pink },
  segmentText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  segmentTextActive: { color: colors.white },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.soft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  chipText: { color: colors.pink, fontSize: 11, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 10,
  },
  rowSelected: { borderColor: colors.pink },
  rowName: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  rowDate: { color: colors.ink, fontWeight: '700', fontSize: 13 },
  rowDays: { color: colors.muted, fontSize: 12, marginTop: 3 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  menuRowHighlighted: { backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.pink },
  menuText: { flex: 1, fontWeight: '700', fontSize: 15 },
  empty: {
    alignItems: 'center',
    padding: 28,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 12,
  },
  emptyTitle: { color: colors.ink, fontWeight: '800', fontSize: 17, marginTop: 10 },
  emptyCopy: { color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
