import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, type Href } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, MenuRow } from '@/components/people-ui';
import { BottomNav, colors } from '@/components/wishdrop-ui';
import { useAuth } from '@/providers/auth-provider';

type MenuItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  href?: Href;
  info?: [string, string];
};

const MENU_GROUPS: readonly (readonly MenuItem[])[] = [
  [
    {
      id: 'edit',
      icon: 'create-outline',
      label: 'Edit Profile',
      info: ['Edit Profile', 'Profile editing is coming soon. Your name and email come from your account.'],
    },
    { id: 'birthdays', icon: 'calendar-outline', label: 'Manage Birthdays', href: '/birthdays' },
    { id: 'family', icon: 'people-outline', label: 'My Family Members', href: { pathname: '/birthdays', params: { tab: 'family' } } },
    { id: 'friends', icon: 'person-add-outline', label: 'My Friends', href: { pathname: '/birthdays', params: { tab: 'friend' } } },
  ],
  [
    { id: 'reminders', icon: 'notifications-outline', label: 'Reminders & Notifications', href: '/settings/notifications' },
    {
      id: 'privacy',
      icon: 'shield-checkmark-outline',
      label: 'Privacy & Security',
      info: ['Privacy & Security', 'Export and deletion are available via the production API.'],
    },
  ],
  [
    {
      id: 'help',
      icon: 'help-circle-outline',
      label: 'Help & Support',
      info: ['Help & Support', 'Questions or feedback? Reach the WishDrop team at support@wishdrop.app.'],
    },
    {
      id: 'about',
      icon: 'information-circle-outline',
      label: 'About WishDrop',
      info: ['About WishDrop', 'Make it. Share it. Let them feel it. Then let it disappear.'],
    },
  ],
];

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { user, status, signOut } = useAuth();

  if (status === 'loading') return null;
  if (!user) return <Redirect href="/welcome" />;

  const logout = async () => {
    await signOut();
    router.replace('/welcome');
  };

  const open = (item: MenuItem) => {
    if (item.href) router.push(item.href);
    else if (item.info) Alert.alert(...item.info);
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.page, { paddingBottom: 110 + insets.bottom }]}>
        <View style={styles.header}>
          {router.canGoBack() ? (
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerSide}>
              <Ionicons name="chevron-back" size={24} color={colors.ink} />
            </Pressable>
          ) : (
            <View style={styles.headerSide} />
          )}
          <Text style={styles.title}>My Account</Text>
          <Pressable onPress={() => router.push('/settings/notifications')} hitSlop={12} style={[styles.headerSide, { alignItems: 'flex-end' }]}>
            <Ionicons name="settings-outline" size={22} color={colors.ink} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Avatar name={user.name} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        </View>

        {MENU_GROUPS.map(group => (
          <View key={group[0].id} style={styles.group}>
            {group.map(item => (
              <MenuRow
                key={item.id}
                icon={item.icon}
                label={item.label}
                highlighted={item.id === 'birthdays'}
                onPress={() => open(item)}
              />
            ))}
          </View>
        ))}

        <View style={styles.group}>
          <MenuRow icon="log-out-outline" label="Log out" destructive onPress={logout} />
        </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  headerSide: { width: 44 },
  title: { flex: 1, textAlign: 'center', color: colors.ink, fontSize: 18, fontWeight: '800' },
  card: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 8,
  },
  name: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  email: { color: colors.muted, marginTop: 4 },
  group: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 14,
    padding: 4,
  },
});
