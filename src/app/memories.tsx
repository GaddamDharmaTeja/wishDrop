import { Redirect, router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { BottomNav, Brand, colors, timeLeft } from '@/components/wishdrop-ui';
import { OCCASIONS } from '@/constants/occasions';
import { api } from '@/lib/api';
import { Surprise } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

export default function Memories() {
  const insets = useSafeAreaInsets();
  const { user, status } = useAuth();
  const [items, setItems] = useState<Surprise[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .surprises()
      .then(({ surprises }) => setItems(surprises))
      .catch((err: unknown) => {
        setItems([]);
        setError(err instanceof Error ? err.message : 'Could not load memories.');
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user) load();
    }, [load, user]),
  );

  if (status === 'loading') {
    return (
      <View style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.pink} />
      </View>
    );
  }
  if (!user) return <Redirect href="/welcome" />;

  const shown = items.filter(
    item =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.recipientName.toLowerCase().includes(query.toLowerCase()),
  );

  const copyRevealLink = async (item: Surprise) => {
    try {
      const url = item.shareUrl ?? (await api.share(item.id)).url;
      await Clipboard.setStringAsync(url);
      Alert.alert('Copied reveal link', url);
    } catch (err) {
      Alert.alert('Could not copy link', err instanceof Error ? err.message : 'Publish this surprise first.');
    }
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.page, { paddingBottom: 100 + insets.bottom }]}>
        <View style={styles.header}>
          <Brand />
          <Pressable onPress={() => router.push('/create' as Href)}>
            <Ionicons name="add-circle" size={28} color={colors.pink} />
          </Pressable>
        </View>
        <Text style={styles.title}>Your memories</Text>
        <Text style={styles.copy}>Surprises become private memories once their public reveal ends.</Text>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            style={styles.input}
            placeholder="Search surprises"
            placeholderTextColor="#A59BB0"
            value={query}
            onChangeText={setQuery}
          />
        </View>
        {loading ? (
          <ActivityIndicator color={colors.pink} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Text onPress={load} style={styles.retry}>
              Tap to retry
            </Text>
          </View>
        ) : shown.length ? (
          shown.map(item => (
            <View key={item.id} style={styles.card}>
              <View style={styles.thumb}>
                <Text style={{ fontSize: 22 }}>
                  {OCCASIONS.find(o => o.label === item.occasion)?.emoji ?? '🎁'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.meta}>
                  For {item.recipientName} · {item.status}
                  {item.status === 'live' ? ` · ${timeLeft(item.expiresAt)}` : ''}
                </Text>
                <Text style={styles.message} numberOfLines={2}>
                  {item.message}
                </Text>
              </View>
              {item.status === 'live' || item.status === 'scheduled' ? (
                <Pressable onPress={() => copyRevealLink(item)} hitSlop={8} accessibilityLabel="Copy reveal link">
                  <Ionicons name="copy-outline" size={20} color={colors.pink} />
                </Pressable>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No memories match your search.</Text>
        )}
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
  },
  title: { color: colors.ink, fontWeight: '900', fontSize: 28, marginTop: 20 },
  copy: { color: colors.muted, marginVertical: 8, lineHeight: 20 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginVertical: 14,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: colors.ink },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 11,
    flexDirection: 'row',
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
  cardTitle: { color: colors.ink, fontWeight: '800', fontSize: 16 },
  meta: { color: colors.pink, fontSize: 12, marginTop: 4, textTransform: 'capitalize' },
  message: { color: colors.muted, marginTop: 8, lineHeight: 18 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 30 },
  errorBox: {
    backgroundColor: '#FFF0F4',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F5C6D6',
  },
  errorText: { color: colors.ink, lineHeight: 20 },
  retry: { color: colors.pink, fontWeight: '800', marginTop: 10 },
});
