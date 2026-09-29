import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Brand, Chip, Field, GradientButton, colors } from '@/components/wishdrop-ui';
import { DURATION_OPTIONS, VISIBILITY_OPTIONS } from '@/constants/occasions';
import { api } from '@/lib/api';
import { openWhatsAppText, revealInviteText, sharePlainText } from '@/lib/share-text';
import { useCreateDraft } from '@/providers/create-draft-provider';

export default function SurpriseSettings() {
  const insets = useSafeAreaInsets();
  const { draft, setDraft, reset } = useCreateDraft();
  const [busy, setBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [surpriseId, setSurpriseId] = useState<string | null>(null);

  const publish = async () => {
    try {
      setBusy(true);
      const now = new Date();
      const opensAt =
        draft.scheduleMode === 'later'
          ? new Date(now.getTime() + 3600000)
          : now;
      const expiresAt = new Date(opensAt.getTime() + draft.hours * 3600000);

      const created = await api.createSurprise({
        title: draft.title || `${draft.recipientName}'s ${draft.occasion}`,
        occasion: draft.occasion,
        recipientName: draft.recipientName,
        message: draft.message,
        media: draft.media,
        theme: draft.theme,
        visibility: draft.visibility,
        anonymous: draft.anonymous,
        allowWishes: draft.allowWishes,
        animation: draft.animation,
        personId: draft.personId ?? undefined,
      });

      const published = await api.publish(created.surprise.id, {
        opensAt: opensAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        pin: draft.pinEnabled && draft.pin ? draft.pin : undefined,
      });

      setSurpriseId(published.surprise.id);
      setShareUrl(published.surprise.shareUrl ?? (await api.share(published.surprise.id)).url);
    } catch (error) {
      Alert.alert('Could not publish', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const nativeShare = async (channel?: 'whatsapp' | 'sms' | 'more') => {
    if (!shareUrl) return;
    const text = revealInviteText(shareUrl);
    if (channel === 'whatsapp') {
      await openWhatsAppText(text);
      return;
    }
    if (channel === 'sms') {
      const sms = `sms:${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(text)}`;
      if (await Linking.canOpenURL(sms)) {
        await Linking.openURL(sms);
        return;
      }
    }
    await sharePlainText(text);
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    await Clipboard.setStringAsync(shareUrl);
    Alert.alert('Copied', shareUrl);
  };

  const done = () => {
    reset();
    setShareUrl(null);
    router.replace('/memories');
  };

  const inviteContributors = () => {
    if (!surpriseId) return;
    const recipientName = draft.recipientName;
    setShareUrl(null);
    reset();
    router.replace({ pathname: '/create/invite', params: { id: surpriseId, name: recipientName } });
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={colors.ink} />
          </Pressable>
          <Brand size="sm" />
          <Text style={styles.step}>2 / 2</Text>
        </View>

        <Text style={styles.title}>Surprise settings</Text>

        <Text style={styles.label}>Who can see this?</Text>
        <View style={styles.visRow}>
          {VISIBILITY_OPTIONS.map(item => (
            <Pressable
              key={item.id}
              onPress={() => setDraft({ visibility: item.id })}
              style={[styles.visCard, draft.visibility === item.id && styles.visOn]}
            >
              <Text style={styles.visTitle}>{item.title}</Text>
              <Text style={styles.visSub}>{item.subtitle}</Text>
            </Pressable>
          ))}
        </View>

        <ToggleRow
          title="Keep creator anonymous"
          value={draft.anonymous}
          onChange={value => setDraft({ anonymous: value })}
        />
        <ToggleRow
          title="Allow friends to add wishes"
          value={draft.allowWishes}
          onChange={value => setDraft({ allowWishes: value })}
        />
        <ToggleRow
          title="PIN protection (optional)"
          value={draft.pinEnabled}
          onChange={value => setDraft({ pinEnabled: value })}
        />
        {draft.pinEnabled ? (
          <Field
            icon="key-outline"
            placeholder="4–12 character PIN"
            value={draft.pin}
            onChangeText={text => setDraft({ pin: text })}
            secureTextEntry
            maxLength={12}
          />
        ) : null}

        <Text style={styles.label}>When should they see it?</Text>
        <View style={styles.segment}>
          {(['now', 'later'] as const).map(mode => (
            <Pressable
              key={mode}
              onPress={() => setDraft({ scheduleMode: mode })}
              style={[styles.segmentItem, draft.scheduleMode === mode && styles.segmentOn]}
            >
              <Text style={[styles.segmentText, draft.scheduleMode === mode && styles.segmentTextOn]}>
                {mode === 'now' ? 'Open now' : 'Schedule for later'}
              </Text>
            </Pressable>
          ))}
        </View>
        {draft.scheduleMode === 'later' ? (
          <Text style={styles.hint}>Opens 1 hour from now (custom picker coming next).</Text>
        ) : null}

        {draft.personId ? (
          <Text style={styles.hint}>Photos and audio are deleted the day after their birthday.</Text>
        ) : null}

        <Text style={styles.label}>How long should it stay?</Text>
        <View style={styles.chips}>
          {DURATION_OPTIONS.map(option => (
            <Chip
              key={option.hours}
              label={option.label}
              selected={draft.hours === option.hours}
              onPress={() => setDraft({ hours: option.hours })}
            />
          ))}
        </View>

        <View style={{ marginTop: 28 }}>
          <GradientButton disabled={busy} onPress={publish}>
            {busy ? 'Creating…' : 'Create Surprise →'}
          </GradientButton>
        </View>
      </ScrollView>

      <Modal visible={Boolean(shareUrl)} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.modalTitle}>Your surprise is ready!</Text>
            <Text style={styles.modalCopy}>Share this link with {draft.recipientName || 'them'}.</Text>

            <View style={styles.linkBox}>
              <Text style={styles.linkText} numberOfLines={1}>
                {shareUrl}
              </Text>
              <Pressable onPress={copyLink} hitSlop={8}>
                <Ionicons name="copy-outline" size={20} color={colors.pink} />
              </Pressable>
            </View>

            <View style={styles.shareRow}>
              {[
                { label: 'WhatsApp', icon: 'logo-whatsapp' as const, channel: 'whatsapp' as const },
                { label: 'Messages', icon: 'chatbubble-outline' as const, channel: 'sms' as const },
                { label: 'More', icon: 'share-outline' as const, channel: 'more' as const },
              ].map(item => (
                <Pressable key={item.label} onPress={() => nativeShare(item.channel)} style={styles.shareBtn}>
                  <Ionicons name={item.icon} size={22} color={colors.ink} />
                  <Text style={styles.shareLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>

            {draft.allowWishes ? (
              <GradientButton onPress={inviteContributors} icon="people-outline">
                Invite family & friends to add wishes
              </GradientButton>
            ) : null}
            <Pressable onPress={done} style={styles.doneLink}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ToggleRow({
  title,
  value,
  onChange,
}: {
  title: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.toggleTitle}>{title}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.pink }} />
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
  title: { fontSize: 26, fontWeight: '900', color: colors.ink, marginBottom: 16 },
  label: { color: colors.ink, fontWeight: '800', marginTop: 18, marginBottom: 10 },
  visRow: { gap: 10 },
  visCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  visOn: { borderColor: colors.pink, backgroundColor: '#FFF0F7' },
  visTitle: { color: colors.ink, fontWeight: '800' },
  visSub: { color: colors.muted, fontSize: 12, marginTop: 3 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  toggleTitle: { color: colors.ink, fontWeight: '700', flex: 1, paddingRight: 12 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  segmentItem: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  segmentOn: { backgroundColor: '#FFE6F3' },
  segmentText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  segmentTextOn: { color: colors.pink },
  hint: { color: colors.muted, fontSize: 12, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(23,22,63,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  modalTitle: { fontSize: 24, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  modalCopy: { color: colors.muted, textAlign: 'center', marginTop: 8, marginBottom: 18 },
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
  shareRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 22 },
  shareBtn: { alignItems: 'center', gap: 6 },
  shareLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  doneLink: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  doneText: { color: colors.ink, fontWeight: '800', fontSize: 15 },
});
