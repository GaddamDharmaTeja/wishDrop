import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { Avatar } from '@/components/people-ui';
import { GradientButton, colors, gradients } from '@/components/wishdrop-ui';
import { api } from '@/lib/api';
import { MediaItem, Surprise, Wish } from '@/lib/types';

type Phase = 'intro' | 'unwrapping' | 'pin' | 'summary' | 'reveal';

function MediaBlock({ item }: { item: MediaItem }) {
  if (item.kind === 'image' && /^https?:\/\//i.test(item.uri)) {
    return <Image source={{ uri: item.uri }} style={styles.media} contentFit="cover" />;
  }
  return null;
}

const STRIP_LIMIT = 5;

function WishesStrip({ wishes }: Readonly<{ wishes: Wish[] }>) {
  const [open, setOpen] = useState(false);
  if (!wishes.length) return null;
  const extra = wishes.length - STRIP_LIMIT;
  return (
    <View style={styles.strip}>
      <Pressable onPress={() => setOpen(value => !value)} style={styles.stripHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.stripTitle}>Messages from your people</Text>
          <View style={styles.stripAvatars}>
            {wishes.slice(0, STRIP_LIMIT).map(item => (
              <View key={item.id} style={styles.stripAvatar}>
                <Avatar name={item.authorName} size={34} />
              </View>
            ))}
            {extra > 0 ? (
              <View style={[styles.stripAvatar, styles.stripMore]}>
                <Text style={styles.stripMoreText}>+{extra}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-forward'} size={20} color={colors.ink} />
      </Pressable>
      {open
        ? wishes.map(item => (
            <View key={item.id} style={styles.stripWish}>
              <Text style={styles.stripAuthor}>{item.authorName}</Text>
              <Text style={styles.stripMessage}>{item.message}</Text>
            </View>
          ))
        : null}
    </View>
  );
}

export default function PublicSurprise() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('intro');
  const [pin, setPin] = useState('');
  const [item, setItem] = useState<Surprise | null>(null);
  const [loading, setLoading] = useState(false);
  const [wish, setWish] = useState('');

  useEffect(() => {
    if (phase !== 'unwrapping') return;
    const timer = setTimeout(() => setPhase('pin'), 1600);
    return () => clearTimeout(timer);
  }, [phase]);

  const stats = useMemo(() => {
    const wishes = item?.wishes ?? [];
    const fromApi = item?.stats;
    if (fromApi) return fromApi;
    let photos = 0;
    let videos = 0;
    let voice = 0;
    for (const wish of wishes) {
      for (const media of wish.media ?? []) {
        if (media.kind === 'image') photos += 1;
        else if (media.kind === 'video') videos += 1;
        else if (media.kind === 'audio') voice += 1;
      }
    }
    return { wishes: wishes.length, photos, videos, voice, music: 0 };
  }, [item]);

  const reveal = async () => {
    try {
      setLoading(true);
      const { surprise } = await api.publicSurprise(token, pin || undefined);
      setItem(surprise);
      setPhase('summary');
    } catch (error) {
      Alert.alert('Not ready yet', error instanceof Error ? error.message : 'This surprise is unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const sendReaction = async (emoji: string) => {
    try {
      await api.react(token, emoji, wish || undefined);
      Alert.alert('Sent!', 'Your reaction was shared.');
      setWish('');
    } catch {
      Alert.alert('Try again', 'Your reaction could not be sent.');
    }
  };

  if (phase === 'intro') {
    return (
      <LinearGradient colors={['#24164A', '#F21C92']} style={[styles.fill, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <Text style={styles.big}>🎁</Text>
          <Text style={styles.introTitle}>Someone made something special for you…</Text>
          <Text style={styles.introCopy}>A WishDrop surprise is waiting to be unwrapped.</Text>
          <GradientButton onPress={() => setPhase('unwrapping')}>Unwrap</GradientButton>
        </View>
      </LinearGradient>
    );
  }

  if (phase === 'unwrapping') {
    return (
      <LinearGradient colors={['#24164A', '#9E22E4']} style={styles.fill}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.introTitle}>Unwrapping your surprise…</Text>
        </View>
      </LinearGradient>
    );
  }

  if (phase === 'pin' && !item) {
    return (
      <LinearGradient colors={['#24164A', '#F21C92']} style={[styles.fill, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <Text style={styles.big}>🔒</Text>
          <Text style={styles.introTitle}>A surprise is waiting</Text>
          <Text style={styles.introCopy}>Enter a PIN if the creator set one, then open it.</Text>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={setPin}
            placeholder="PIN (optional)"
            placeholderTextColor="#999"
            secureTextEntry
          />
          <GradientButton disabled={loading} onPress={reveal}>
            {loading ? 'Opening…' : 'Open surprise'}
          </GradientButton>
        </View>
      </LinearGradient>
    );
  }

  if (!item) return null;

  if (phase === 'summary') {
    const parts = [
      `${stats.wishes} ${stats.wishes === 1 ? 'wish' : 'wishes'}`,
      stats.photos ? `${stats.photos} photos` : null,
      stats.videos ? `${stats.videos} videos` : null,
      stats.voice ? `${stats.voice} voice notes` : null,
    ].filter(Boolean);
    return (
      <LinearGradient colors={['#24164A', '#F21C92']} style={[styles.fill, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <Text style={styles.big}>🎁</Text>
          <Text style={styles.introTitle}>Happy {item.occasion}, {item.recipientName.split(' ')[0]}!</Text>
          <Text style={styles.introCopy}>{parts.join(', ') || 'A surprise packed with love'} waiting for you.</Text>
          <GradientButton onPress={() => setPhase('reveal')}>View my surprise</GradientButton>
          <Pressable
            style={{ marginTop: 16 }}
            onPress={() => router.push({ pathname: '/surprise/wall', params: { token } })}
          >
            <Text style={{ color: '#FFADD8', fontWeight: '800' }}>Open Memory Wall</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[...gradients.brand]} style={[styles.fill, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.reveal, { paddingBottom: insets.bottom + 40 }]}>
        <Text style={styles.big}>🎁</Text>
        <Text style={styles.eyebrow}>{item.occasion.toUpperCase()}</Text>
        <Text style={styles.revealTitle}>{item.title}</Text>
        <Text style={styles.for}>Made especially for {item.recipientName}</Text>
        <View style={styles.mediaList}>
          {item.media?.map(media => (
            <MediaBlock key={media.id} item={media} />
          ))}
        </View>
        <Text style={styles.message}>{item.message}</Text>
        <WishesStrip wishes={item.wishes ?? []} />

        <View style={{ alignSelf: 'stretch', marginTop: 20 }}>
          <GradientButton onPress={() => router.push({ pathname: '/surprise/wall', params: { token } })}>
            Open Memory Wall
          </GradientButton>
        </View>

        <Text style={styles.reaction}>Send some love</Text>
        <View style={styles.reactions}>
          {['♥', '🥹', '✨', '🎉'].map(emoji => (
            <Pressable key={emoji} onPress={() => sendReaction(emoji)}>
              <Text style={styles.emoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>

        {item.allowWishes !== false ? (
          <>
            <Text style={styles.wishesTitle}>People who made your day special</Text>
            <TextInput
              style={styles.wishInput}
              placeholder="Add a short wish…"
              placeholderTextColor="#C9B8D8"
              value={wish}
              onChangeText={setWish}
              maxLength={280}
            />
            <GradientButton onPress={() => sendReaction('✨')}>Share your wish</GradientButton>
          </>
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center' },
  big: { fontSize: 72 },
  introTitle: {
    color: 'white',
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 20,
    lineHeight: 34,
  },
  introCopy: { color: '#F5D6EA', textAlign: 'center', marginVertical: 14, lineHeight: 22 },
  input: {
    alignSelf: 'stretch',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginVertical: 22,
  },
  reveal: { padding: 28, alignItems: 'center' },
  eyebrow: { color: '#FFADD8', fontWeight: '800', marginTop: 12, letterSpacing: 1 },
  revealTitle: { color: 'white', textAlign: 'center', fontSize: 32, fontWeight: '900', marginTop: 8 },
  for: { color: '#E8DDF3', marginTop: 10 },
  message: { color: 'white', textAlign: 'center', fontSize: 17, lineHeight: 27, marginTop: 28 },
  mediaList: { width: '100%', gap: 12, marginTop: 20 },
  media: { width: '100%', height: 240, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.25)' },
  reaction: { color: '#FFADD8', marginTop: 36, fontWeight: '700' },
  reactions: { flexDirection: 'row', gap: 18, marginTop: 14 },
  emoji: { fontSize: 28 },
  wishesTitle: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
    marginTop: 36,
    alignSelf: 'stretch',
  },
  strip: {
    alignSelf: 'stretch',
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 14,
    marginTop: 28,
  },
  stripHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stripTitle: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  stripAvatars: { flexDirection: 'row', marginTop: 10 },
  stripAvatar: { marginRight: -8, borderRadius: 19, borderWidth: 2, borderColor: colors.white },
  stripMore: {
    width: 38,
    height: 38,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripMoreText: { color: colors.pink, fontWeight: '800', fontSize: 12 },
  stripWish: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, marginTop: 10 },
  stripAuthor: { color: colors.pink, fontWeight: '800' },
  stripMessage: { color: colors.ink, marginTop: 3, lineHeight: 20 },
  wishInput: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    padding: 14,
    color: 'white',
    marginVertical: 12,
  },
});
