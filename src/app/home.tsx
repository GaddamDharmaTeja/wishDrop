import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/people-ui';
import { BottomNav, Brand, GradientButton, colors, gradients, timeLeft } from '@/components/wishdrop-ui';
import { OCCASIONS } from '@/constants/occasions';
import { useStartSurprise } from '@/hooks/use-start-surprise';
import { api } from '@/lib/api';
import { daysLabel, daysUntil, sortUpcoming } from '@/lib/birthdays';
import { Surprise } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { useCreateDraft } from '@/providers/create-draft-provider';
import { usePeople } from '@/providers/people-provider';

type QuickAction = { id: string; label: string; emoji: string; href?: Href; occasion?: string };

const QUICK_ACTIONS: readonly QuickAction[] = [
  { id: 'birthdays', label: 'Birthdays', emoji: '🎂', href: '/birthdays' },
  { id: 'anniversary', label: 'Anniversary', emoji: '💕', occasion: 'Anniversary' },
  { id: 'baby', label: 'New Baby', emoji: '🧸', occasion: 'New Baby' },
  { id: 'thanks', label: 'Thank You', emoji: '🙏', occasion: 'Thank You' },
  { id: 'graduation', label: 'Graduation', emoji: '🎓', occasion: 'Graduation' },
  { id: 'more', label: 'More', emoji: '✨', href: '/create' },
];

function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const { user, status } = useAuth();
  const { people } = usePeople();
  const { setDraft, reset } = useCreateDraft();
  const startSurprise = useStartSurprise();
  const [items, setItems] = useState<Surprise[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .surprises()
      .then(({ surprises }) => setItems(surprises))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user) load();
    }, [load, user]),
  );

  const nextPerson = useMemo(() => sortUpcoming(people)[0], [people]);

  if (status === 'loading') {
    return (
      <View style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.pink} />
      </View>
    );
  }
  if (!user) return <Redirect href="/welcome" />;

  const startOccasion = (label: string) => {
    reset();
    setDraft({ occasion: label, title: `${label} surprise` });
    router.push({ pathname: '/create/for', params: { occasion: label } });
  };

  const onQuickAction = (action: QuickAction) => {
    if (action.href) router.push(action.href);
    else if (action.occasion) startOccasion(action.occasion);
  };

  const live = items.filter(item => item.status === 'live' || item.status === 'scheduled');
  const firstName = user.name.split(' ')[0];

  const renderRecent = () => {
    if (loading) return <ActivityIndicator color={colors.pink} />;
    if (!live.length) return <Text style={styles.empty}>Your next wonderful moment starts here.</Text>;
    return live.slice(0, 4).map(item => (
      <Pressable key={item.id} onPress={() => router.push('/memories')} style={styles.card}>
        <View style={styles.thumb}>
          <Text style={{ fontSize: 22 }}>{OCCASIONS.find(o => o.label === item.occasion)?.emoji ?? '🎁'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardMeta}>
            {new Date(item.opensAt).toLocaleDateString()} · {item.status}
          </Text>
        </View>
        {item.status === 'live' ? <Text style={styles.countdown}>{timeLeft(item.expiresAt)}</Text> : null}
      </Pressable>
    ));
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.page, { paddingBottom: 100 + insets.bottom }]}>
        <View style={styles.header}>
          <Brand />
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push('/birthdays/upcoming')} hitSlop={10} accessibilityLabel="Upcoming birthdays">
              <Ionicons name="notifications-outline" size={24} color={colors.ink} />
            </Pressable>
            <Pressable onPress={() => router.push('/profile')} hitSlop={6} accessibilityLabel="My account">
              <Avatar name={user.name} size={34} />
            </Pressable>
          </View>
        </View>

        <LinearGradient colors={[...gradients.soft]} style={styles.hero}>
          <Text style={styles.heroTitle}>
            {greeting()}, {firstName}! 👋
          </Text>
          <Text style={styles.heroCopy}>Create beautiful surprises for your loved ones.</Text>
          <GradientButton
            onPress={() => {
              reset();
              router.push('/create' as Href);
            }}
          >
            + Create a Surprise →
          </GradientButton>
        </LinearGradient>

        <Pressable style={styles.row} onPress={() => router.push('/birthdays/upcoming')}>
          <Text style={styles.section}>Next Birthday</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} style={{ marginBottom: 12 }} />
        </Pressable>
        {nextPerson ? (
          <View style={styles.nextCard}>
            <Avatar name={nextPerson.name} uri={nextPerson.photoUri} size={52} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{nextPerson.name.split(' ')[0]}&apos;s Birthday</Text>
              <Text style={styles.nextDays}>{daysLabel(daysUntil(nextPerson.birthday))}</Text>
            </View>
            <Pressable onPress={() => startSurprise(nextPerson)}>
              <LinearGradient colors={[...gradients.cta]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.smallButton}>
                <Text style={styles.smallButtonText}>Create Surprise</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.nextCard} onPress={() => router.push('/people/add')}>
            <Text style={{ fontSize: 30 }}>🎂</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Never miss a birthday</Text>
              <Text style={[styles.cardMeta, { textTransform: 'none' }]}>Add family and friends to get reminders.</Text>
            </View>
            <Ionicons name="add-circle" size={28} color={colors.pink} />
          </Pressable>
        )}

        <Text style={[styles.section, { marginTop: 22 }]}>Quick Actions</Text>
        <View style={styles.grid}>
          {QUICK_ACTIONS.map(action => (
            <Pressable key={action.id} onPress={() => onQuickAction(action)} style={styles.occasion}>
              <Text style={styles.emoji}>{action.emoji}</Text>
              <Text style={styles.small}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.row, { marginTop: 20 }]}>
          <Text style={styles.section}>Your Recent Surprises</Text>
          <Text onPress={() => router.push('/memories')} style={styles.link}>
            See all →
          </Text>
        </View>
        {renderRecent()}
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  center: { alignItems: 'center', justifyContent: 'center' },
  page: { paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 4,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  hero: { borderRadius: 28, padding: 22, marginBottom: 22, overflow: 'hidden' },
  heroTitle: { color: colors.ink, fontSize: 26, fontWeight: '900', lineHeight: 32 },
  heroCopy: { color: colors.muted, marginVertical: 10, lineHeight: 20 },
  section: { color: colors.ink, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: colors.pink, fontWeight: '700', marginBottom: 12 },
  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  nextDays: { color: colors.pink, fontWeight: '800', marginTop: 4 },
  smallButton: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  smallButtonText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  occasion: {
    width: '31%',
    minHeight: 84,
    backgroundColor: colors.white,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  emoji: { fontSize: 26 },
  small: { fontSize: 11, color: colors.ink, textAlign: 'center', marginTop: 6, fontWeight: '600' },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  cardMeta: { color: colors.muted, fontSize: 12, marginTop: 3, textTransform: 'capitalize' },
  countdown: { color: colors.pink, fontWeight: '800', fontSize: 12 },
  empty: {
    color: colors.muted,
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
