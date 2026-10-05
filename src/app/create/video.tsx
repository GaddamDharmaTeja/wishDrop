import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/people-ui';
import { Chip, GradientButton, colors } from '@/components/wishdrop-ui';
import { api } from '@/lib/api';
import { VideoStyle } from '@/lib/types';

const STYLES: { id: VideoStyle; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'emotional', label: 'Emotional' },
  { id: 'fun', label: 'Fun' },
  { id: 'minimal', label: 'Minimal' },
];

const DURATIONS = [30, 60, 90, 120];

export default function AutoVideo() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const [style, setStyle] = useState<VideoStyle>('classic');
  const [includeMusic, setIncludeMusic] = useState(true);
  const [includeNames, setIncludeNames] = useState(true);
  const [durationSec, setDurationSec] = useState(60);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const generate = async () => {
    if (!params.id) return;
    setBusy(true);
    try {
      await api.generateVideo(params.id, { style, includeMusic, includeNames, durationSec });
      setReady(true);
      Alert.alert('Memory reel ready', 'Open the surprise Memory Wall to play the slideshow reel.');
    } catch (err) {
      Alert.alert('Could not generate', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + 32 }]}>
        <ScreenHeader title="Auto video" onBack={() => router.back()} />
        <Text style={styles.copy}>
          Compile wishes, photos, and clips for {params.name || 'them'} into a shareable memory reel.
        </Text>

        <Text style={styles.label}>Style</Text>
        <View style={styles.chips}>
          {STYLES.map(item => (
            <Chip key={item.id} label={item.label} selected={style === item.id} onPress={() => setStyle(item.id)} />
          ))}
        </View>

        <View style={styles.toggle}>
          <Text style={styles.toggleTitle}>Background music</Text>
          <Switch value={includeMusic} onValueChange={setIncludeMusic} trackColor={{ true: colors.pink }} />
        </View>
        <View style={styles.toggle}>
          <Text style={styles.toggleTitle}>Show contributor names</Text>
          <Switch value={includeNames} onValueChange={setIncludeNames} trackColor={{ true: colors.pink }} />
        </View>

        <Text style={styles.label}>Duration</Text>
        <View style={styles.chips}>
          {DURATIONS.map(item => (
            <Chip
              key={item}
              label={`${item}s`}
              selected={durationSec === item}
              onPress={() => setDurationSec(item)}
            />
          ))}
        </View>

        <View style={{ marginTop: 28 }}>
          <GradientButton disabled={busy} onPress={generate}>
            {busy ? 'Generating…' : ready ? 'Regenerate reel' : 'Generate video'}
          </GradientButton>
        </View>
        {ready ? (
          <Pressable style={styles.note}>
            <Text style={styles.noteText}>
              Reel saved on this surprise. Recipients can play it from the Memory Wall after unwrap.
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: 20 },
  copy: { color: colors.muted, lineHeight: 20, marginBottom: 8 },
  label: { color: colors.ink, fontWeight: '800', marginTop: 22, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  toggleTitle: { color: colors.ink, fontWeight: '700', flex: 1, paddingRight: 12 },
  note: { marginTop: 16, backgroundColor: '#FFF0F7', borderRadius: 14, padding: 14 },
  noteText: { color: colors.ink, lineHeight: 20 },
});
