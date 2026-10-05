import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Chip, colors } from '@/components/wishdrop-ui';
import { api } from '@/lib/api';
import { MediaItem, Surprise, Wish } from '@/lib/types';

type Tab = 'all' | 'messages' | 'photos' | 'videos' | 'voice' | 'reel';

const width = Dimensions.get('window').width;

export default function MemoryWall() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<Surprise | null>(null);
  const [error, setError] = useState<string | null>(token ? null : 'Invalid link.');
  const [tab, setTab] = useState<Tab>('all');
  const [reelIndex, setReelIndex] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .publicSurprise(token)
      .then(({ surprise }) => {
        if (!cancelled) setItem(surprise);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not open Memory Wall.');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const tiles = useMemo(() => {
    const wishes = item?.wishes ?? [];
    const rows: { id: string; kind: Tab; wish?: Wish; media?: MediaItem; message?: string; author?: string }[] = [];
    for (const wish of wishes) {
      rows.push({ id: `msg-${wish.id}`, kind: 'messages', wish, message: wish.message, author: wish.authorName });
      for (const media of wish.media ?? []) {
        const kind =
          media.kind === 'image' ? 'photos' : media.kind === 'video' ? 'videos' : media.kind === 'audio' ? 'voice' : 'all';
        rows.push({ id: `${wish.id}-${media.id}`, kind: kind as Tab, wish, media, author: wish.authorName });
      }
    }
    for (const media of item?.media ?? []) {
      if (media.kind === 'image' || media.kind === 'video') {
        rows.push({
          id: `creator-${media.id}`,
          kind: media.kind === 'image' ? 'photos' : 'videos',
          media,
          author: item?.anonymous ? 'Someone special' : 'Creator',
        });
      }
    }
    return rows;
  }, [item]);

  const shown = tab === 'all' || tab === 'reel' ? tiles : tiles.filter(tile => tile.kind === tab);
  const reelSlides = useMemo(
    () =>
      tiles.filter(tile => tile.kind === 'photos' || tile.kind === 'messages' || tile.kind === 'videos').slice(0, 20),
    [tiles],
  );

  useEffect(() => {
    if (tab !== 'reel' || !reelSlides.length) return;
    const timer = setInterval(() => {
      setReelIndex(current => (current + 1) % reelSlides.length);
    }, Math.max(2000, ((item?.videoReel?.durationSec ?? 60) * 1000) / Math.max(reelSlides.length, 1)));
    return () => clearInterval(timer);
  }, [tab, reelSlides, item?.videoReel?.durationSec]);

  if (error) {
    return (
      <View style={[styles.safe, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.error}>{error}</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.pink} />
      </View>
    );
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
        </Pressable>
        <Text style={styles.title}>Memory Wall</Text>
        <View style={{ width: 26 }} />
      </View>
      <Text style={styles.copy}>
        {item.title} · {item.wishes?.length ?? 0} wishes
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {(
          [
            ['all', 'All'],
            ['messages', 'Messages'],
            ['photos', 'Photos'],
            ['videos', 'Videos'],
            ['voice', 'Voice'],
            ['reel', 'Reel'],
          ] as const
        ).map(([id, label]) => (
          <Chip key={id} label={label} selected={tab === id} onPress={() => setTab(id)} />
        ))}
      </ScrollView>

      {tab === 'reel' ? (
        <LinearGradient colors={['#24164A', '#F21C92']} style={styles.reel}>
          {reelSlides.length ? (
            <>
              {reelSlides[reelIndex]?.media?.kind === 'image' ? (
                <Image source={{ uri: reelSlides[reelIndex].media!.uri }} style={styles.reelImage} contentFit="cover" />
              ) : (
                <Text style={styles.reelMessage}>{reelSlides[reelIndex]?.message ?? 'Celebrating you'}</Text>
              )}
              {(item.videoReel?.includeNames !== false || !item.videoReel) && reelSlides[reelIndex]?.author ? (
                <Text style={styles.reelAuthor}>{reelSlides[reelIndex].author}</Text>
              ) : null}
              <Text style={styles.reelMeta}>
                {reelIndex + 1}/{reelSlides.length} · {item.videoReel?.style ?? 'classic'}
              </Text>
            </>
          ) : (
            <Text style={styles.reelMessage}>Add wishes to generate a reel.</Text>
          )}
        </LinearGradient>
      ) : (
        <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 24 }]}>
          {shown.map(tile => (
            <View key={tile.id} style={[styles.tile, tile.kind === 'messages' ? styles.tileWide : null]}>
              {tile.media?.kind === 'image' ? (
                <Image source={{ uri: tile.media.uri }} style={styles.tileImage} contentFit="cover" />
              ) : (
                <View style={styles.tileBody}>
                  <Text style={styles.tileKind}>
                    {tile.kind === 'videos' ? 'Video' : tile.kind === 'voice' ? 'Voice' : 'Message'}
                  </Text>
                  {tile.message ? (
                    <Text style={styles.tileMessage} numberOfLines={5}>
                      {tile.message}
                    </Text>
                  ) : (
                    <Text style={styles.tileMessage}>{tile.media?.name}</Text>
                  )}
                  {tile.author ? <Text style={styles.tileAuthor}>{tile.author}</Text> : null}
                </View>
              )}
            </View>
          ))}
          {!shown.length ? <Text style={styles.empty}>Nothing in this tab yet.</Text> : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  title: { color: colors.ink, fontWeight: '900', fontSize: 20 },
  copy: { color: colors.muted, paddingHorizontal: 20, marginBottom: 10 },
  tabs: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  grid: {
    paddingHorizontal: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: (width - 34) / 2,
    minHeight: 140,
    backgroundColor: colors.white,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  tileWide: { width: width - 24 },
  tileImage: { width: '100%', height: 160 },
  tileBody: { padding: 12, gap: 6 },
  tileKind: { color: colors.pink, fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
  tileMessage: { color: colors.ink, lineHeight: 20, fontWeight: '600' },
  tileAuthor: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  empty: { color: colors.muted, padding: 20 },
  error: { color: '#D93636', marginBottom: 12 },
  back: { color: colors.pink, fontWeight: '800' },
  reel: {
    flex: 1,
    margin: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    overflow: 'hidden',
  },
  reelImage: { width: '100%', height: '70%', borderRadius: 18 },
  reelMessage: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', textAlign: 'center', lineHeight: 32 },
  reelAuthor: { color: '#FFADD8', marginTop: 16, fontWeight: '800' },
  reelMeta: { color: '#F5D6EA', marginTop: 8, fontWeight: '700' },
});
