import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, ScreenHeader } from '@/components/people-ui';
import { GradientButton, colors, gradients } from '@/components/wishdrop-ui';
import { api } from '@/lib/api';
import { contributeInviteText, openWhatsAppText, sharePlainText } from '@/lib/share-text';
import { Wish } from '@/lib/types';

type ShareTarget = { id: 'whatsapp' | 'sms' | 'more'; label: string; icon: keyof typeof Ionicons.glyphMap };

const TARGETS: readonly ShareTarget[] = [
  { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
  { id: 'sms', label: 'Messages', icon: 'chatbubble-outline' },
  { id: 'more', label: 'More', icon: 'share-outline' },
];

export default function InviteContributors() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const firstName = (params.name ?? '').split(' ')[0] || 'them';
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    api
      .invite(params.id)
      .then(result => setUrl(result.url))
      .catch(err => setError(err instanceof Error ? err.message : 'Could not create an invite link.'));
  }, [params.id]);

  useFocusEffect(
    useCallback(() => {
      if (!params.id) return;
      api
        .wishes(params.id)
        .then(result => setWishes(result.wishes))
        .catch(() => setWishes([]));
    }, [params.id]),
  );

  const inviteText = url ? contributeInviteText(url) : '';

  const copy = async () => {
    if (!inviteText) return;
    await Clipboard.setStringAsync(inviteText);
    Alert.alert('Copied', 'Contribute link copied. Paste it into WhatsApp.');
  };

  const shareVia = async (target: ShareTarget) => {
    if (!url || !inviteText) return;
    if (target.id === 'whatsapp') {
      await openWhatsAppText(inviteText);
      return;
    }
    if (target.id === 'sms') {
      const sms = `sms:${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(inviteText)}`;
      if (await Linking.canOpenURL(sms)) {
        await Linking.openURL(sms);
        return;
      }
    }
    await sharePlainText(inviteText);
  };

  const renderLink = () => {
    if (error) return <Text style={styles.error}>{error}</Text>;
    if (!url) return <ActivityIndicator color={colors.pink} style={{ marginVertical: 18 }} />;
    return (
      <>
        <View style={styles.linkBox}>
          <Text style={styles.linkText} numberOfLines={1}>
            {url}
          </Text>
          <Pressable onPress={copy} hitSlop={8} accessibilityLabel="Copy invite link">
            <Ionicons name="copy-outline" size={20} color={colors.pink} />
          </Pressable>
        </View>
        <View style={{ marginTop: 14 }}>
          <GradientButton icon="share-social-outline" onPress={() => shareVia(TARGETS[2])}>
            Share Invite Link
          </GradientButton>
        </View>
        <View style={styles.targets}>
          {TARGETS.map(target => (
            <Pressable key={target.id} onPress={() => shareVia(target)} style={styles.target}>
              <Ionicons name={target.icon} size={24} color={colors.ink} />
              <Text style={styles.targetLabel}>{target.label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.optionRow} onPress={() => setShowQr(value => !value)}>
          <Ionicons name="qr-code-outline" size={20} color={colors.ink} />
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>QR Code</Text>
            <Text style={styles.optionCopy}>Let them scan and contribute</Text>
          </View>
          <Ionicons name={showQr ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
        </Pressable>
        {showQr ? (
          <View style={styles.qr}>
            <QRCode value={url} size={180} color={colors.ink} backgroundColor={colors.white} />
          </View>
        ) : null}
      </>
    );
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + 32 }]}>
        <ScreenHeader title="Invite Family & Friends" onBack={() => router.replace('/memories')} />
        <Text style={styles.copy}>
          Share this link with family and friends so they can add their messages or photos for {firstName}.
        </Text>
        <LinearGradient colors={[...gradients.soft]} style={styles.hero}>
          <Text style={{ fontSize: 56 }}>👨‍👩‍👧‍👦</Text>
          <Text style={{ fontSize: 26 }}>💗</Text>
        </LinearGradient>

        {renderLink()}

        <View style={styles.optionRow}>
          <Ionicons name="people-outline" size={20} color={colors.ink} />
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>Contributors</Text>
            <Text style={styles.optionCopy}>
              {wishes.length ? `${wishes.length} ${wishes.length === 1 ? 'wish' : 'wishes'} received` : 'No wishes yet'}
            </Text>
          </View>
        </View>
        {wishes.map(wish => (
          <View key={wish.id} style={styles.wish}>
            <Avatar name={wish.authorName} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={styles.wishAuthor}>{wish.authorName}</Text>
              <Text style={styles.wishMessage}>{wish.message}</Text>
            </View>
          </View>
        ))}

        <Pressable onPress={() => router.replace('/memories')} style={styles.done}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: 20 },
  copy: { color: colors.muted, textAlign: 'center', lineHeight: 20 },
  hero: {
    borderRadius: 24,
    height: 130,
    marginVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  error: { color: '#D93636', textAlign: 'center', marginVertical: 14, lineHeight: 20 },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  linkText: { flex: 1, color: colors.ink, fontWeight: '600' },
  targets: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 18 },
  target: {
    alignItems: 'center',
    gap: 6,
    width: 86,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  targetLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 10,
  },
  optionTitle: { color: colors.ink, fontWeight: '800' },
  optionCopy: { color: colors.muted, fontSize: 12, marginTop: 2 },
  qr: { alignItems: 'center', padding: 18, backgroundColor: colors.white, borderRadius: 16, marginTop: 10 },
  wish: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  wishAuthor: { color: colors.ink, fontWeight: '800' },
  wishMessage: { color: colors.muted, marginTop: 3, lineHeight: 19 },
  done: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  doneText: { color: colors.ink, fontWeight: '800', fontSize: 15 },
});
