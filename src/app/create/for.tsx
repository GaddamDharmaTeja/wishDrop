import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, PersonRow, ScreenHeader, SegmentTabs } from '@/components/people-ui';
import { Field, GradientButton, colors } from '@/components/wishdrop-ui';
import { birthdayMessage, useStartSurprise } from '@/hooks/use-start-surprise';
import { PersonGroup } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { useCreateDraft } from '@/providers/create-draft-provider';
import { usePeople } from '@/providers/people-provider';

export default function WhoIsThisFor() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ occasion?: string; personId?: string; change?: string }>();
  const { user, status } = useAuth();
  const { people, loading } = usePeople();
  const { draft, setDraft } = useCreateDraft();
  const startSurprise = useStartSurprise();
  const occasion = params.occasion ?? draft.occasion;

  const [group, setGroup] = useState<PersonGroup>(
    () => people.find(person => person.id === (params.personId ?? draft.personId))?.group ?? 'family',
  );
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(params.personId ?? draft.personId);

  const counts = useMemo(
    () => ({
      family: people.filter(person => person.group === 'family').length,
      friend: people.filter(person => person.group === 'friend').length,
    }),
    [people],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle) {
      return people.filter(
        person => person.name.toLowerCase().includes(needle) || person.relationship.toLowerCase().includes(needle),
      );
    }
    return people.filter(person => person.group === group);
  }, [people, group, query]);

  if (status === 'loading') return null;
  if (!user) return <Redirect href="/welcome" />;

  const someoneElse = () => {
    setDraft({ personId: null, recipientName: '', occasion });
    if (params.change === '1') router.back();
    else router.push({ pathname: '/create/compose', params: { occasion } });
  };

  const next = () => {
    const person = people.find(item => item.id === selectedId);
    if (!person) return;
    if (params.change !== '1') {
      startSurprise(person, occasion);
      return;
    }
    setDraft({
      personId: person.id,
      recipientName: person.name,
      title: `${person.name.split(' ')[0]}'s ${occasion} Surprise`,
      message: draft.message || (occasion === 'Birthday' ? birthdayMessage(person) : ''),
    });
    router.back();
  };

  if (loading && !people.length) {
    return (
      <View style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.pink} />
      </View>
    );
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.page}>
        <ScreenHeader title="Who is this for?" />
        {people.length ? (
          <>
            <Field icon="search-outline" placeholder="Search family & friends" value={query} onChangeText={setQuery} />
            {query ? null : (
              <SegmentTabs
                options={[
                  { key: 'family', label: `Family (${counts.family})` },
                  { key: 'friend', label: `Friends (${counts.friend})` },
                ]}
                value={group}
                onChange={setGroup}
              />
            )}
            <FlatList
              data={visible}
              keyExtractor={item => item.id}
              style={{ flex: 1, marginTop: query ? 12 : 0 }}
              ListEmptyComponent={<Text style={styles.none}>No one here yet.</Text>}
              renderItem={({ item }) => (
                <PersonRow
                  person={item}
                  selected={item.id === selectedId}
                  showCountdown={false}
                  onPress={() => setSelectedId(item.id)}
                />
              )}
            />
          </>
        ) : (
          <View style={{ flex: 1 }}>
            <EmptyState
              emoji="💝"
              title="Save your people"
              copy="Add family and friends once, then pick them here to pre-fill every surprise."
            />
            <Pressable style={styles.addLink} onPress={() => router.push('/people/add')}>
              <Ionicons name="add-circle-outline" size={20} color={colors.pink} />
              <Text style={styles.link}>Add family or friends</Text>
            </Pressable>
          </View>
        )}

        <View style={{ paddingBottom: insets.bottom + 12, gap: 4 }}>
          {people.length ? (
            <GradientButton onPress={next} disabled={!selectedId}>
              Continue →
            </GradientButton>
          ) : null}
          <Pressable onPress={someoneElse} style={styles.addLink}>
            <Text style={styles.link}>Someone else</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  center: { alignItems: 'center', justifyContent: 'center' },
  page: { flex: 1, paddingHorizontal: 20 },
  none: { color: colors.muted, textAlign: 'center', marginTop: 24 },
  addLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  link: { color: colors.pink, fontWeight: '800', fontSize: 15 },
});
