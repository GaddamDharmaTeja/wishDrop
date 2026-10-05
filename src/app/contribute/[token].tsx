import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
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
import { GradientButton, OutlineButton, colors } from '@/components/wishdrop-ui';
import { api } from '@/lib/api';
import { ContributeInfo, MediaItem, WishStyle } from '@/lib/types';

type IdentityMode = 'named' | 'anonymous' | 'custom';
type Tab = 'text' | 'media' | 'voice';

const STYLE_LABELS: Record<WishStyle, string> = {
  emotional: 'Emotional',
  funny: 'Funny',
  sweet: 'Sweet',
  respectful: 'Respectful',
  casual: 'Casual',
};

export default function Contribute() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const insets = useSafeAreaInsets();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const [info, setInfo] = useState<ContributeInfo | null>(null);
  const [error, setError] = useState<string | null>(token ? null : 'Invalid contribution link.');
  const [identity, setIdentity] = useState<IdentityMode>('named');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [tab, setTab] = useState<Tab>('text');
  const [style, setStyle] = useState<WishStyle>('sweet');
  const [suggestion, setSuggestion] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const recordingMs = recorderState.durationMillis ?? 0;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .contributeInfo(token)
      .then(result => {
        if (!cancelled) {
          setInfo(result);
          setError(null);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'This invite is no longer available.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const authorName = useMemo(() => {
    if (identity === 'anonymous') return 'Anonymous';
    return name.trim();
  }, [identity, name]);

  const waveform = useMemo(() => {
    const bars = 24;
    return Array.from({ length: bars }, (_, index) => {
      const pulse = recorderState.isRecording ? 0.35 + ((index + Math.floor(recordingMs / 120)) % 5) * 0.12 : 0.25;
      return Math.min(1, pulse + (index % 3) * 0.08);
    });
  }, [recorderState.isRecording, recordingMs]);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const pickMedia = async (videos: boolean) => {
    if (!token) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: videos ? ['videos'] : ['images'],
      quality: 0.8,
      allowsMultipleSelection: !videos,
      selectionLimit: 3,
    });
    if (result.canceled) return;
    try {
      const uploaded: MediaItem[] = [];
      for (const asset of result.assets.slice(0, 3 - media.length)) {
        const kind = asset.type === 'video' ? 'video' : 'image';
        const { media: item } = await api.uploadMedia(asset.uri, kind, asset.fileName ?? kind, {
          contributeToken: token,
        });
        uploaded.push(item);
      }
      setMedia(current => [...current, ...uploaded].slice(0, 3));
      setTab('media');
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Try again.');
    }
  };

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone needed', 'Allow microphone access to record a voice wish.');
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setTab('voice');
    } catch {
      Alert.alert('Microphone needed', 'Allow microphone access to record a voice wish.');
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri || !token) return;
      const { media: item } = await api.uploadMedia(uri, 'audio', 'Voice wish', { contributeToken: token });
      setMedia(current => [...current.filter(entry => entry.kind !== 'audio'), item].slice(0, 3));
    } catch (err) {
      Alert.alert('Could not save voice', err instanceof Error ? err.message : 'Try again.');
    }
  };

  const askAi = async () => {
    if (!token || !info) return;
    setAiBusy(true);
    try {
      const result = await api.contributeAi(token, style);
      setSuggestion(result.suggestion);
      setShowAi(true);
    } catch (err) {
      Alert.alert('AI unavailable', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setAiBusy(false);
    }
  };

  const send = async () => {
    if (!authorName || !message.trim()) {
      Alert.alert('Almost there', 'Choose how you appear and add a message.');
      return;
    }
    if (!token) {
      Alert.alert('Invalid link', 'This contribution link is not valid.');
      return;
    }
    if (info?.passwordRequired && !password.trim()) {
      Alert.alert('Password needed', 'Enter the contribution password.');
      return;
    }
    setBusy(true);
    try {
      await api.contribute(token, {
        authorName,
        message: message.trim(),
        media,
        password: password.trim() || undefined,
      });
      setSent(true);
    } catch (err) {
      Alert.alert('Could not send', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const renderBody = () => {
    if (error) {
      return (
        <>
          <Text style={styles.big}>💌</Text>
          <Text style={styles.title}>This invite is closed</Text>
          <Text style={styles.copy}>{error}</Text>
          <OutlineButton onPress={leave}>Close</OutlineButton>
        </>
      );
    }

    if (!info) return <ActivityIndicator color="#FFFFFF" size="large" />;

    const firstName = info.recipientName?.split(' ')[0] || info.recipientName;

    if (sent) {
      return (
        <>
          <Text style={styles.big}>🎉</Text>
          <Text style={styles.title}>Sent!</Text>
          <Text style={styles.copy}>Your wish will be part of {firstName}&apos;s surprise.</Text>
          <OutlineButton onPress={leave}>Close</OutlineButton>
        </>
      );
    }

    return (
      <>
        <Text style={styles.big}>💌</Text>
        <Text style={styles.eyebrow}>{info.occasion?.toUpperCase()}</Text>
        <Text style={styles.title}>Add your wish for {firstName}</Text>
        <Text style={styles.copy}>Your message will appear when {firstName} opens the surprise.</Text>

        {info.passwordRequired ? (
          <TextInput
            style={styles.input}
            placeholder="Contribution password"
            placeholderTextColor="#9A8FA8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        ) : null}

        <Text style={styles.section}>Who are you?</Text>
        <View style={styles.identityRow}>
          {(
            [
              { id: 'named' as const, label: 'My name' },
              { id: 'anonymous' as const, label: 'Anonymous' },
              { id: 'custom' as const, label: 'Custom' },
            ] as const
          ).map(item => (
            <Pressable
              key={item.id}
              onPress={() => setIdentity(item.id)}
              style={[styles.identityChip, identity === item.id && styles.identityOn]}
            >
              <Text style={[styles.identityText, identity === item.id && styles.identityTextOn]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        {identity !== 'anonymous' ? (
          <TextInput
            style={styles.input}
            placeholder={identity === 'custom' ? 'Custom name' : 'Your name'}
            placeholderTextColor="#9A8FA8"
            value={name}
            onChangeText={setName}
            maxLength={60}
            autoCapitalize="words"
          />
        ) : null}

        <View style={styles.tabs}>
          {(
            [
              { id: 'text' as const, label: 'Text', icon: 'text-outline' as const },
              { id: 'media' as const, label: 'Media', icon: 'images-outline' as const },
              { id: 'voice' as const, label: 'Voice', icon: 'mic-outline' as const },
            ] as const
          ).map(item => (
            <Pressable key={item.id} onPress={() => setTab(item.id)} style={[styles.tab, tab === item.id && styles.tabOn]}>
              <Ionicons name={item.icon} size={16} color={tab === item.id ? colors.pink : '#F5D6EA'} />
              <Text style={[styles.tabText, tab === item.id && styles.tabTextOn]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'text' ? (
          <>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Write something from the heart..."
              placeholderTextColor="#9A8FA8"
              value={message}
              onChangeText={setMessage}
              maxLength={500}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{message.length}/500</Text>
            <Pressable onPress={() => setShowAi(value => !value)} style={styles.aiToggle}>
              <Ionicons name="sparkles-outline" size={16} color="#FFADD8" />
              <Text style={styles.aiToggleText}>AI Wish Assistant</Text>
            </Pressable>
            {showAi ? (
              <View style={styles.aiCard}>
                <View style={styles.styleRow}>
                  {(Object.keys(STYLE_LABELS) as WishStyle[]).map(item => (
                    <Pressable
                      key={item}
                      onPress={() => setStyle(item)}
                      style={[styles.styleChip, style === item && styles.styleOn]}
                    >
                      <Text style={[styles.styleText, style === item && styles.styleTextOn]}>{STYLE_LABELS[item]}</Text>
                    </Pressable>
                  ))}
                </View>
                {suggestion ? <Text style={styles.suggestion}>{suggestion}</Text> : null}
                <View style={styles.aiActions}>
                  <OutlineButton onPress={askAi}>{aiBusy ? 'Thinking…' : suggestion ? 'Retry' : 'Generate'}</OutlineButton>
                  {suggestion ? (
                    <GradientButton
                      onPress={() => {
                        setMessage(suggestion);
                        setTab('text');
                      }}
                    >
                      Use this
                    </GradientButton>
                  ) : null}
                </View>
              </View>
            ) : null}
          </>
        ) : null}

        {tab === 'media' ? (
          <View style={styles.mediaBox}>
            <View style={styles.mediaActions}>
              <Pressable style={styles.mediaBtn} onPress={() => pickMedia(false)}>
                <Ionicons name="image-outline" size={22} color={colors.ink} />
                <Text style={styles.mediaLabel}>Photo</Text>
              </Pressable>
              <Pressable style={styles.mediaBtn} onPress={() => pickMedia(true)}>
                <Ionicons name="videocam-outline" size={22} color={colors.ink} />
                <Text style={styles.mediaLabel}>Video</Text>
              </Pressable>
            </View>
            {media.filter(item => item.kind === 'image' || item.kind === 'video').map(item => (
              <View key={item.id} style={styles.mediaRow}>
                <Text style={styles.mediaRowText}>
                  {item.kind}: {item.name}
                </Text>
                <Pressable onPress={() => setMedia(current => current.filter(entry => entry.id !== item.id))}>
                  <Ionicons name="close" size={18} color={colors.muted} />
                </Pressable>
              </View>
            ))}
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Add a short caption..."
              placeholderTextColor="#9A8FA8"
              value={message}
              onChangeText={setMessage}
              maxLength={500}
              multiline
              textAlignVertical="top"
            />
          </View>
        ) : null}

        {tab === 'voice' ? (
          <View style={styles.voiceBox}>
            <View style={styles.wave}>
              {waveform.map((height, index) => (
                <View key={`bar-${index}`} style={[styles.bar, { height: 12 + height * 36 }]} />
              ))}
            </View>
            <Text style={styles.timer}>
              {Math.floor(recordingMs / 1000 / 60)
                .toString()
                .padStart(1, '0')}
              :
              {Math.floor((recordingMs / 1000) % 60)
                .toString()
                .padStart(2, '0')}
            </Text>
            {recorderState.isRecording ? (
              <GradientButton onPress={stopRecording}>Stop & preview</GradientButton>
            ) : (
              <GradientButton onPress={startRecording} icon="mic-outline">
                {media.some(item => item.kind === 'audio') ? 'Re-record' : 'Start recording'}
              </GradientButton>
            )}
            {media.some(item => item.kind === 'audio') ? (
              <Text style={styles.voiceReady}>Voice note attached</Text>
            ) : null}
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Optional text with your voice note..."
              placeholderTextColor="#9A8FA8"
              value={message}
              onChangeText={setMessage}
              maxLength={500}
              multiline
              textAlignVertical="top"
            />
          </View>
        ) : null}

        <View style={styles.buttonContainer}>
          <GradientButton onPress={send} disabled={busy}>
            {busy ? 'Sending…' : 'Send my wish'}
          </GradientButton>
        </View>
      </>
    );
  };

  return (
    <LinearGradient colors={['#24164A', '#7526D9', '#F21C92']} style={styles.fill}>
      <ScrollView
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderBody()}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  big: { fontSize: 64, marginBottom: 4 },
  eyebrow: {
    color: '#FFADD8',
    fontWeight: '800',
    marginTop: 14,
    letterSpacing: 1,
    fontSize: 13,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 10,
  },
  copy: {
    color: '#F5D6EA',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 18,
    lineHeight: 22,
    fontSize: 15,
  },
  section: { alignSelf: 'stretch', color: '#FFADD8', fontWeight: '800', marginBottom: 8 },
  identityRow: { alignSelf: 'stretch', flexDirection: 'row', gap: 8, marginBottom: 4 },
  identityChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  identityOn: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  identityText: { color: '#F5D6EA', fontWeight: '700', fontSize: 12 },
  identityTextOn: { color: colors.ink },
  tabs: { alignSelf: 'stretch', flexDirection: 'row', gap: 8, marginTop: 14 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  tabOn: { backgroundColor: '#FFFFFF' },
  tabText: { color: '#F5D6EA', fontWeight: '700', fontSize: 12 },
  tabTextOn: { color: colors.pink },
  input: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#17163F',
    marginTop: 12,
  },
  multiline: { minHeight: 130 },
  counter: { alignSelf: 'flex-end', color: '#F5D6EA', fontSize: 11, marginTop: 6 },
  aiToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start' },
  aiToggleText: { color: '#FFADD8', fontWeight: '800' },
  aiCard: {
    alignSelf: 'stretch',
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 12,
  },
  styleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  styleChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  styleOn: { backgroundColor: '#FFFFFF' },
  styleText: { color: '#F5D6EA', fontSize: 12, fontWeight: '700' },
  styleTextOn: { color: colors.ink },
  suggestion: { color: '#FFFFFF', marginTop: 12, lineHeight: 21 },
  aiActions: { marginTop: 12, gap: 10 },
  mediaBox: { alignSelf: 'stretch' },
  mediaActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  mediaBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
  },
  mediaLabel: { color: colors.ink, fontWeight: '800' },
  mediaRow: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediaRowText: { color: '#FFFFFF', fontWeight: '600', textTransform: 'capitalize' },
  voiceBox: { alignSelf: 'stretch', marginTop: 8 },
  wave: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bar: { width: 4, borderRadius: 4, backgroundColor: '#FFADD8' },
  timer: { color: '#FFFFFF', fontWeight: '900', fontSize: 28, textAlign: 'center', marginVertical: 14 },
  voiceReady: { color: '#FFADD8', textAlign: 'center', marginTop: 10, fontWeight: '700' },
  buttonContainer: { alignSelf: 'stretch', marginTop: 8 },
});
