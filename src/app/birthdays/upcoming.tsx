import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, PersonRow, ScreenHeader } from '@/components/people-ui';
import { BottomNav, colors, gradients } from '@/components/wishdrop-ui';
import { useStartSurprise } from '@/hooks/use-start-surprise';
import { daysLabel, daysUntil, sortUpcoming } from '@/lib/birthdays';
import { useAuth } from '@/providers/auth-provider';
import { usePeople } from '@/providers/people-provider';

export default function UpcomingBirthdays() {
  const insets = useSafeAreaInsets();
  const { user, status } = useAuth();
  const { people } = usePeople();
  const startSurprise = useStartSurprise();
  const [next, ...rest] = useMemo(() => sortUpcoming(people), [people]);

  if (status === 'loading') return null;
  if (!user) return <Redirect href="/welcome" />;

  const bell = (
    <Pressable onPress={() => router.push('/settings/notifications')} hitSlop={10} accessibilityLabel="Reminder settings">
      <Ionicons name="notifications-outline" size={22} color={colors.ink} />
    </Pressable>
  );

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.page}>
        <ScreenHeader title="Upcoming Birthdays" right={bell} />
        {next ? (
          <LinearGradient colors={[...gradients.soft]} style={styles.hero}>
            <Text style={{ fontSize: 40 }}>🎁</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{next.name.split(' ')[0]}&apos;s Birthday</Text>
              <Text style={styles.heroDays}>{daysLabel(daysUntil(next.birthday))}</Text>
            </View>
            <Pressable onPress={() => startSurprise(next)}>
              <LinearGradient colors={[...gradients.cta]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.heroButton}>
                <Text style={styles.heroButtonText}>Create Surprise</Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        ) : null}
        <FlatList
          data={rest}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
          ListEmptyComponent={
            next ? null : (
              <EmptyState emoji="🎈" title="Nothing coming up" copy="Add family and friends to see their birthdays here." />
            )
          }
          renderItem={({ item }) => <PersonRow person={item} onPress={() => startSurprise(item)} />}
        />
      </View>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  page: { flex: 1, paddingHorizontal: 20 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
    padding: 16,
    marginVertical: 12,
  },
  heroTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  heroDays: { color: colors.pink, fontWeight: '800', marginTop: 4 },
  heroButton: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  heroButtonText: { color: colors.white, fontWeight: '800', fontSize: 13 },
});
