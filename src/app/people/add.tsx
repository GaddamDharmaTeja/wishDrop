import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/people-ui';
import { colors } from '@/components/wishdrop-ui';
import { PersonGroup } from '@/lib/types';

const OPTIONS: readonly {
  group: PersonGroup;
  title: string;
  copy: string;
  emoji: string;
  colors: readonly [string, string];
}[] = [
  {
    group: 'family',
    title: 'Add Family Member',
    copy: 'Parents, siblings, spouse, children, relatives',
    emoji: '👨‍👩‍👧‍👦',
    colors: ['#FFF0F7', '#FFD9EA'],
  },
  {
    group: 'friend',
    title: 'Add Friend',
    copy: 'Close friends, colleagues, classmates',
    emoji: '🧑‍🤝‍🧑',
    colors: ['#F3EDFF', '#E3D6FF'],
  },
];

export default function AddPerson() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.page}>
        <ScreenHeader title="" />
        <Text style={styles.title}>Add to Your People</Text>
        <Text style={styles.copy}>Add family members and friends so you never miss their special days.</Text>
        {OPTIONS.map(option => (
          <Pressable
            key={option.group}
            onPress={() => router.replace({ pathname: '/people/edit', params: { group: option.group } })}
          >
            <LinearGradient colors={[...option.colors]} style={styles.card}>
              <Text style={styles.emoji}>{option.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={styles.cardCopy}>{option.copy}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.ink} />
            </LinearGradient>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  page: { flex: 1, paddingHorizontal: 20 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '900', textAlign: 'center', marginTop: 8 },
  copy: { color: colors.muted, textAlign: 'center', marginTop: 8, marginBottom: 22, lineHeight: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    minHeight: 120,
  },
  emoji: { fontSize: 44 },
  cardTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  cardCopy: { color: colors.muted, fontSize: 13, marginTop: 4, lineHeight: 18 },
});
