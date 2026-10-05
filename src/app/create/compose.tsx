import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/people-ui';
import { Brand, Field, GradientButton, colors } from '@/components/wishdrop-ui';
import { ANIMATIONS, TEMPLATES } from '@/constants/occasions';
import { api } from '@/lib/api';
import { formatShort } from '@/lib/birthdays';
import { MediaItem } from '@/lib/types';
import { useCreateDraft } from '@/providers/create-draft-provider';
import { usePeople } from '@/providers/people-provider';

const mediaKinds = [
  { id: 'text', label: 'Text', icon: 'text-outline' as const },
  { id: 'photo', label: 'Photo', icon: 'image-outline' as const },
  { id: 'video', label: 'Video', icon: 'videocam-outline' as const },
  { id: 'voice', label: 'Voice', icon: 'mic-outline' as const },
  { id: 'music', label: 'Music', icon: 'musical-notes-outline' as const },
];

export default function ComposeSurprise() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ occasion?: string }>();
  const { draft, setDraft } = useCreateDraft();
  const { getPerson } = usePeople();
  const person = getPerson(draft.personId ?? undefined);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    if (params.occasion && params.occasion !== draft.occasion) {
      setDraft({ occasion: params.occasion, title: draft.title || `${params.occasion} surprise` });
    }
    // Intentionally sync only when the route param changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.occasion]);

  const pickMedia = async (videos: boolean) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: videos ? ['videos'] : ['images'],
      allowsMultipleSelection: !videos,
      quality: 0.8,
    });
    if (result.canceled) return;

    const uploaded: MediaItem[] = [];
    for (const asset of result.assets) {
      try {
        const kind = asset.type === 'video' ? 'video' : 'image';
        const { media } = await api.uploadMedia(asset.uri, kind, asset.fileName ?? kind);
        uploaded.push(media);
      } catch (error) {
        Alert.alert(
          'Upload needed for sharing',
          error instanceof Error
            ? error.message
            : 'Media must upload to the server so recipients can see it on the share link.',
        );
        return;
      }
    }

    setDraft({ media: [...draft.media, ...uploaded] });
  };

  const recordVoice = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone needed', 'Allow microphone access to attach a voice note.');
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      Alert.alert('Recording', 'Tap OK when finished to attach your voice note.', [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: async () => {
            try {
              await recorder.stop();
            } catch {
              /* ignore */
            }
          },
        },
        {
          text: 'Attach',
          onPress: async () => {
            try {
              await recorder.stop();
              const uri = recorder.uri;
              if (!uri) return;
              const { media } = await api.uploadMedia(uri, 'audio', 'Voice note');
              setDraft({ media: [...draft.media, media] });
            } catch (error) {
              Alert.alert('Could not save voice', error instanceof Error ? error.message : 'Try again.');
            }
          },
        },
      ]);
    } catch {
      Alert.alert('Microphone needed', 'Allow microphone access to attach a voice note.');
    }
  };

  const onMediaPress = (id: string) => {
    if (id === 'photo') return pickMedia(false);
    if (id === 'video') return pickMedia(true);
    if (id === 'voice') return recordVoice();
    if (id === 'text') return;
    Alert.alert('Coming soon', 'Licensed music unlocks after your media provider is configured.');
  };

  const next = () => {
    if (!draft.recipientName.trim() || !draft.message.trim()) {
      return Alert.alert('Almost there', "Add the recipient's name and your message.");
    }
    if (!draft.title.trim()) {
      setDraft({ title: `${draft.recipientName}'s ${draft.occasion}` });
    }
    router.push('/create/settings');
  };

  const template = TEMPLATES.find(t => t.id === draft.theme) ?? TEMPLATES[0];

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={colors.ink} />
          </Pressable>
          <Brand size="sm" />
          <Text style={styles.step}>1 / 2</Text>
        </View>

        <Text style={styles.title}>
          {person ? `Create ${person.name.split(' ')[0]}'s ${draft.occasion} Surprise` : 'Create your surprise'}
        </Text>
        <Text style={styles.occasion}>{draft.occasion}</Text>

        {person ? (
          <View style={styles.personCard}>
            <Avatar name={person.name} uri={person.photoUri} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={styles.personName}>{person.name}</Text>
              <Text style={styles.personMeta}>
                {person.relationship} · {formatShort(person.birthday)}
              </Text>
            </View>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/create/for', params: { occasion: draft.occasion, change: '1' } })
              }
              style={styles.change}
            >
              <Text style={styles.changeText}>Change</Text>
            </Pressable>
          </View>
        ) : null}

        <LinearGradient colors={[...template.colors]} style={styles.preview}>
          <Text style={styles.previewEyebrow}>Preview</Text>
          <Text style={styles.previewTitle}>{draft.title || 'Your surprise title'}</Text>
          <Text style={styles.previewMsg} numberOfLines={3}>
            {draft.message || 'Your message will appear here…'}
          </Text>
          <Text style={styles.previewFor}>For {draft.recipientName || 'someone special'}</Text>
        </LinearGradient>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaBar}>
          {mediaKinds.map(item => (
            <Pressable key={item.id} onPress={() => onMediaPress(item.id)} style={styles.mediaChip}>
              <Ionicons name={item.icon} size={18} color={colors.pink} />
              <Text style={styles.mediaLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {draft.media.length ? (
          <Text style={styles.mediaCount}>{draft.media.length} media attached</Text>
        ) : null}

        {person ? null : (
          <Field
            icon="person-outline"
            placeholder="Recipient's name"
            value={draft.recipientName}
            onChangeText={text => setDraft({ recipientName: text })}
            autoCapitalize="words"
          />
        )}
        <Field
          icon="sparkles-outline"
          placeholder="Surprise title"
          value={draft.title}
          onChangeText={text => setDraft({ title: text })}
        />
        <View style={styles.messageBox}>
          <Field
            placeholder="Your message"
            value={draft.message}
            onChangeText={text => setDraft({ message: text.slice(0, 500) })}
            multiline
          />
          <Text style={styles.counter}>{draft.message.length}/500</Text>
        </View>

        <Text style={styles.label}>Choose a template</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {TEMPLATES.map(item => (
            <Pressable
              key={item.id}
              onPress={() => setDraft({ theme: item.id })}
              style={[styles.template, draft.theme === item.id && styles.templateOn]}
            >
              <LinearGradient colors={[...item.colors]} style={styles.templateSwatch} />
              <Text style={styles.templateLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.label, { marginTop: 18 }]}>Choose animation</Text>
        <View style={styles.animGrid}>
          {ANIMATIONS.map(item => (
            <Pressable
              key={item.id}
              onPress={() => setDraft({ animation: item.id })}
              style={[styles.anim, draft.animation === item.id && styles.animOn]}
            >
              <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
              <Text style={styles.animLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: 22 }}>
          <GradientButton onPress={next}>Preview →</GradientButton>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: 20 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  step: { color: colors.pink, fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '900', color: colors.ink },
  occasion: { color: colors.muted, marginBottom: 14, marginTop: 4 },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 14,
  },
  personName: { color: colors.ink, fontWeight: '800', fontSize: 16 },
  personMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  change: {
    borderWidth: 1,
    borderColor: colors.pink,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeText: { color: colors.pink, fontWeight: '800', fontSize: 13 },
  preview: {
    borderRadius: 24,
    padding: 22,
    minHeight: 160,
    marginBottom: 14,
  },
  previewEyebrow: { color: 'rgba(23,22,63,0.55)', fontWeight: '700', fontSize: 12 },
  previewTitle: { color: colors.ink, fontSize: 22, fontWeight: '900', marginTop: 8 },
  previewMsg: { color: colors.ink, marginTop: 10, lineHeight: 22, opacity: 0.85 },
  previewFor: { color: colors.pink, fontWeight: '700', marginTop: 14 },
  mediaBar: { gap: 8, paddingVertical: 4 },
  mediaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mediaLabel: { color: colors.ink, fontWeight: '700', fontSize: 13 },
  mediaCount: { color: colors.pink, fontSize: 12, fontWeight: '700', marginTop: 8 },
  messageBox: { position: 'relative' },
  counter: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    color: colors.muted,
    fontSize: 11,
  },
  label: { color: colors.ink, fontWeight: '800', marginTop: 16, marginBottom: 10 },
  template: {
    width: 96,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  templateOn: { borderColor: colors.pink },
  templateSwatch: { height: 56 },
  templateLabel: { textAlign: 'center', paddingVertical: 6, fontSize: 12, fontWeight: '700', color: colors.ink },
  animGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  anim: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  animOn: { borderColor: colors.pink, backgroundColor: '#FFE6F3' },
  animLabel: { fontSize: 11, color: colors.ink, fontWeight: '600' },
});
