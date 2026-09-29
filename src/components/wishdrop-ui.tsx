import { LinearGradient } from 'expo-linear-gradient';
import { PropsWithChildren, ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const colors = {
  ink: '#17163F',
  muted: '#746F86',
  pink: '#F21C92',
  coral: '#FF735E',
  orange: '#FF8E53',
  purple: '#7526D9',
  paper: '#FFF9FC',
  line: '#EEE4EC',
  soft: '#FFE8F2',
  white: '#FFFFFF',
};

export const gradients = {
  cta: [colors.coral, colors.pink, '#9E22E4'] as const,
  brand: ['#9E22E4', colors.pink] as const,
  soft: ['#FFF0F7', '#FFE4EC'] as const,
};

export function Brand({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const fontSize = size === 'lg' ? 28 : size === 'sm' ? 18 : 22;
  const mark = size === 'lg' ? 36 : size === 'sm' ? 22 : 28;
  return (
    <View style={styles.brandRow}>
      <LinearGradient colors={[...gradients.brand]} style={[styles.logoMark, { width: mark, height: mark, borderRadius: mark / 2 }]}>
        <Ionicons name="heart" size={mark * 0.55} color="#fff" />
      </LinearGradient>
      <Text style={[styles.brand, { fontSize }]}>
        <Text style={{ color: colors.purple }}>Wish</Text>
        <Text style={{ color: colors.pink }}>Drop</Text>
      </Text>
    </View>
  );
}

export function GradientButton({
  children,
  onPress,
  disabled = false,
  icon,
}: PropsWithChildren<{ onPress: () => void; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap }>) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={{ opacity: disabled ? 0.55 : 1 }}>
      <LinearGradient colors={[...gradients.cta]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
        {icon ? <Ionicons name={icon} size={18} color="#fff" style={{ marginRight: 8 }} /> : null}
        <Text style={styles.buttonText}>{children}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function OutlineButton({
  children,
  onPress,
  icon,
  disabled = false,
}: PropsWithChildren<{ onPress: () => void; icon?: ReactNode; disabled?: boolean }>) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.outlineButton, { opacity: disabled ? 0.55 : 1 }]}>
      {icon ? <View style={styles.outlineIcon}>{icon}</View> : null}
      <Text style={styles.outlineText}>{children}</Text>
    </Pressable>
  );
}

export function Field({
  icon,
  right,
  style,
  multiline,
  ...props
}: TextInputProps & { icon?: keyof typeof Ionicons.glyphMap; right?: ReactNode }) {
  return (
    <View style={[styles.field, multiline ? styles.fieldMultiline : null]}>
      {icon && !multiline ? (
        <Ionicons name={icon} size={20} color={colors.muted} style={styles.fieldIcon} />
      ) : null}
      <TextInput
        placeholderTextColor="#A59BB0"
        multiline={multiline}
        {...props}
        style={[
          styles.fieldInput,
          icon && !multiline ? { paddingLeft: 44 } : null,
          right ? { paddingRight: 44 } : null,
          multiline ? { height: 110, textAlignVertical: 'top', paddingTop: 14 } : null,
          style,
        ]}
      />
      {right ? <View style={styles.fieldRight}>{right}</View> : null}
    </View>
  );
}

export function Screen({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function SocialIconButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={styles.socialSquare}>
      {children}
      <Text style={styles.socialLabel}>{label}</Text>
    </Pressable>
  );
}

const TABS = [
  { href: '/home', label: 'Home', icon: 'home-outline' as const, activeIcon: 'home' as const },
  { href: '/create', label: 'Create', icon: 'add-circle-outline' as const, activeIcon: 'add-circle' as const },
  { href: '/birthdays', label: 'Birthdays', icon: 'calendar-outline' as const, activeIcon: 'calendar' as const },
  { href: '/memories', label: 'Memories', icon: 'heart-outline' as const, activeIcon: 'heart' as const },
  { href: '/profile', label: 'Profile', icon: 'person-outline' as const, activeIcon: 'person' as const },
];

export function BottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map(tab => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Pressable key={tab.href} onPress={() => router.push(tab.href as Href)} style={styles.navItem}>
            <Ionicons
              name={active ? tab.activeIcon : tab.icon}
              size={22}
              color={active ? colors.pink : colors.muted}
            />
            <Text style={[styles.navLabel, active && { color: colors.pink, fontWeight: '700' }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function GoogleGlyph() {
  return (
    <View style={styles.gMark}>
      <Text style={styles.gText}>G</Text>
    </View>
  );
}

export function timeLeft(expiresAt?: string): string {
  if (!expiresAt) return '';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Ended';
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours >= 48) return `${Math.floor(hours / 24)}d left`;
  if (hours >= 1) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, padding: 22 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoMark: { alignItems: 'center', justifyContent: 'center' },
  brand: { fontWeight: '800' },
  button: {
    minHeight: 56,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '800' },
  outlineButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 10,
  },
  outlineIcon: { marginRight: 10 },
  outlineText: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  field: {
    height: 56,
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1.5,
    borderRadius: 16,
    marginTop: 12,
    justifyContent: 'center',
  },
  fieldMultiline: {
    height: 120,
    alignItems: 'stretch',
  },
  fieldIcon: { position: 'absolute', left: 14, zIndex: 1 },
  fieldRight: { position: 'absolute', right: 14, zIndex: 1 },
  fieldInput: { height: '100%', paddingHorizontal: 16, fontSize: 16, color: colors.ink },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipSelected: { borderColor: colors.pink, backgroundColor: '#FFE6F3' },
  chipText: { color: colors.ink, fontWeight: '600', fontSize: 13 },
  chipTextSelected: { color: colors.pink, fontWeight: '800' },
  socialSquare: {
    width: 88,
    height: 72,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  socialLabel: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  gMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gText: { fontWeight: '900', color: '#4285F4', fontSize: 13 },
  nav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
  },
  navItem: { alignItems: 'center', minWidth: 56, gap: 2 },
  navLabel: { fontSize: 11, color: colors.muted },
});
