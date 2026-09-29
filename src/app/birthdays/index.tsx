import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, PersonRow, ScreenHeader, SegmentTabs } from '@/components/people-ui';
import { BottomNav, colors, gradients } from '@/components/wishdrop-ui';
import { useStartSurprise } from '@/hooks/use-start-surprise';
import { sortUpcoming } from '@/lib/birthdays';
import { Person } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { usePeople } from '@/providers/people-provider';

type Tab = 'all' | 'family' | 'friend';

const TITLES: Record<Tab, string> = { all: 'Birthdays', family: 'My Family Members', friend: 'My Friends' };

function isTab(value?: string): value is Tab {
  return value === 'all' || value === 'family' || value === 'friend';
}

export default function Birthdays() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { user, status } = useAuth();
  const { people, loading, removePerson } = usePeople();
  const startSurprise = useStartSurprise();
  const [tab, setTab] = useState<Tab>(isTab(params.tab) ? params.tab : 'all');

  const counts = useMemo(
    () => ({
      all: people.length,
      family: people.filter(person => person.group === 'family').length,
      friend: people.filter(person => person.group === 'friend').length,
    }),
    [people],
  );

  const visible = useMemo(
    () => sortUpcoming(tab === 'all' ? people : people.filter(person => person.group === tab)),
    [people, tab],
  );

  if (status === 'loading') return null;
  if (!user) return <Redirect href="/welcome" />;

  const addHref: Href = tab === 'all' ? '/people/add' : { pathname: '/people/edit', params: { group: tab } };

  const confirmDelete = (person: Person) =>
    Alert.alert(`Remove ${person.name}?`, 'Their birthday reminders will stop too.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          removePerson(person.id).catch(error =>
            Alert.alert('Could not remove', error instanceof Error ? error.message : 'Try again.'),
          ),
      },
    ]);

  const openMenu = (person: Person) =>
    Alert.alert(person.name, undefined, [
      { text: 'Create surprise', onPress: () => startSurprise(person) },
      { text: 'Edit', onPress: () => router.push({ pathname: '/people/edit', params: { id: person.id } }) },
      { text: 'Remove', style: 'destructive', onPress: () => confirmDelete(person) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const addButton = (
    <Pressable onPress={() => router.push(addHref)} hitSlop={8} accessibilityLabel="Add person">
      <LinearGradient colors={[...gradients.cta]} style={styles.add}>
        <Ionicons name="add" size={22} color={colors.white} />
      </LinearGradient>
    </Pressable>
  );

  const renderEmpty = () => {
    if (loading) return <ActivityIndicator color={colors.pink} style={{ marginTop: 24 }} />;
    return (
      <EmptyState
        emoji="🎂"
        title="No birthdays yet"
        copy="Add family and friends so you never miss their special days."
      />
    );
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.page}>
        <ScreenHeader title={TITLES[isTab(params.tab) ? params.tab : 'all']} right={addButton} />
        <SegmentTabs
          options={[
            { key: 'all', label: `All (${counts.all})` },
            { key: 'family', label: `Family (${counts.family})` },
            { key: 'friend', label: `Friends (${counts.friend})` },
          ]}
          value={tab}
          onChange={setTab}
        />
        <FlatList
          data={visible}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
          ListEmptyComponent={renderEmpty}
          renderItem={({ item }) => (
            <PersonRow
              person={item}
              onPress={() => router.push({ pathname: '/people/edit', params: { id: item.id } })}
              right={
                <Pressable onPress={() => openMenu(item)} hitSlop={10} style={styles.more} accessibilityLabel="More options">
                  <Ionicons name="ellipsis-horizontal" size={18} color={colors.ink} />
                </Pressable>
              }
            />
          )}
        />
      </View>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  page: { flex: 1, paddingHorizontal: 20 },
  add: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  more: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
