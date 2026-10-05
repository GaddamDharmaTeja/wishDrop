import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, ScreenHeader } from '@/components/people-ui';
import { Chip, Field, GradientButton, colors, gradients } from '@/components/wishdrop-ui';
import { api } from '@/lib/api';
import { contributeInviteText, openWhatsAppText, sharePlainText } from '@/lib/share-text';
import { InviteSettings, MediaKind, ReportReason, Wish } from '@/lib/types';

type ShareTarget = { id: 'whatsapp' | 'instagram' | 'sms' | 'more'; label: string; icon: keyof typeof Ionicons.glyphMap };
type MediaFilter = 'all' | MediaKind;

const TARGETS: readonly ShareTarget[] = [
  { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
  { id: 'instagram', label: 'Instagram', icon: 'logo-instagram' },
  { id: 'sms', label: 'Messages', icon: 'chatbubble-outline' },
  { id: 'more', label: 'More', icon: 'share-outline' },
];

const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'inappropriate', label: 'Inappropriate content' },
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'offensive', label: 'Offensive language' },
  { id: 'other', label: 'Other' },
];

const FILTERS: { id: MediaFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'image', label: 'Photos' },
  { id: 'video', label: 'Videos' },
  { id: 'audio', label: 'Voice' },
];

function toLocalInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function InviteContributors() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const firstName = (params.name ?? '').split(' ')[0] || 'them';
  const [url, setUrl] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [showQr, setShowQr] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState<MediaFilter>('all');
  const [maxWishes, setMaxWishes] = useState('');
  const [password, setPassword] = useState('');
  const [expiry, setExpiry] = useState<Date | null>(null);
  const [expiryPickerDefault] = useState(() => new Date(Date.now() + 86400000));
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const [reportWish, setReportWish] = useState<Wish | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>('inappropriate');
  const [reportDetails, setReportDetails] = useState('');
  const [menuWish, setMenuWish] = useState<Wish | null>(null);

  const loadInvite = useCallback(() => {
    if (!params.id) return;
    api
      .invite(params.id)
      .then(result => {
        setUrl(result.url);
        setInvite(result.invite);
        setExpiry(result.invite.expiresAt ? new Date(result.invite.expiresAt) : null);
        setMaxWishes(result.invite.maxWishes ? String(result.invite.maxWishes) : '');
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Could not create an invite link.'));
  }, [params.id]);

  useEffect(() => {
    loadInvite();
  }, [loadInvite]);

  useFocusEffect(
    useCallback(() => {
      if (!params.id) return;
      api
        .wishes(params.id)
        .then(result => setWishes(result.wishes.filter(wish => wish.moderation !== 'hidden')))
        .catch(() => setWishes([]));
    }, [params.id]),
  );

  const inviteText = url ? contributeInviteText(url) : '';
  const visibleWishes = useMemo(() => {
    if (filter === 'all') return wishes;
    return wishes.filter(wish => wish.media?.some(item => item.kind === filter));
  }, [filter, wishes]);

  const copy = async () => {
    if (!inviteText) return;
    await Clipboard.setStringAsync(inviteText);
    Alert.alert('Copied', 'Contribute link copied.');
  };

  const shareVia = async (target: ShareTarget) => {
    if (!url || !inviteText) return;
    if (target.id === 'whatsapp') {
      await openWhatsAppText(inviteText);
      return;
    }
    if (target.id === 'instagram') {
      await sharePlainText(inviteText);
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

  const saveSettings = async () => {
    if (!params.id) return;
    try {
      const result = await api.updateInviteSettings(params.id, {
        expiresAt: expiry ? expiry.toISOString() : null,
        maxWishes: maxWishes ? Number(maxWishes) : null,
        password: password.trim() ? password.trim() : undefined,
      });
      setInvite(result.invite);
      setPassword('');
      setShowSettings(false);
      Alert.alert('Saved', 'Contribution link settings updated.');
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Try again.');
    }
  };

  const regenerate = async () => {
    if (!params.id) return;
    try {
      const result = await api.regenerateInvite(params.id);
      setUrl(result.url);
      setInvite(result.invite);
      Alert.alert('New link ready', 'Old contribution links no longer work.');
    } catch (err) {
      Alert.alert('Could not regenerate', err instanceof Error ? err.message : 'Try again.');
    }
  };

  const disableLink = async () => {
    if (!params.id) return;
    try {
      const result = await api.disableInvite(params.id);
      setInvite(result.invite);
      Alert.alert('Link disabled', 'Contributors can no longer add wishes.');
    } catch (err) {
      Alert.alert('Could not disable', err instanceof Error ? err.message : 'Try again.');
    }
  };

  const confirmDelete = (wish: Wish) => {
    Alert.alert('Delete wish?', `Remove the wish from ${wish.authorName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!params.id) return;
          try {
            await api.deleteWish(params.id, wish.id);
            setWishes(current => current.filter(item => item.id !== wish.id));
            setMenuWish(null);
          } catch (err) {
            Alert.alert('Could not delete', err instanceof Error ? err.message : 'Try again.');
          }
        },
      },
    ]);
  };

  const submitReport = async () => {
    if (!params.id || !reportWish) return;
    try {
      await api.reportWish(params.id, reportWish.id, reportReason, reportDetails.trim() || undefined);
      setWishes(current =>
        current.map(item => (item.id === reportWish.id ? { ...item, moderation: 'reported' } : item)),
      );
      setReportWish(null);
      setReportDetails('');
      setMenuWish(null);
      Alert.alert('Reported', 'Thanks — this wish was flagged for review.');
    } catch (err) {
      Alert.alert('Could not report', err instanceof Error ? err.message : 'Try again.');
    }
  };

  const renderLink = () => {
    if (error) return <Text style={styles.error}>{error}</Text>;
    if (!url) return <ActivityIndicator color={colors.pink} style={{ marginVertical: 18 }} />;
    return (
      <>
        <View style={styles.statusRow}>
          <View style={[styles.dot, invite?.status === 'active' ? styles.dotOn : styles.dotOff]} />
          <Text style={styles.statusText}>Link status: {invite?.status ?? 'active'}</Text>
        </View>
        <View style={styles.linkBox}>
          <Text style={styles.linkText} numberOfLines={1}>
            {url}
          </Text>
          <Pressable onPress={copy} hitSlop={8} accessibilityLabel="Copy invite link">
            <Ionicons name="copy-outline" size={20} color={colors.pink} />
          </Pressable>
        </View>
        <View style={{ marginTop: 14 }}>
          <GradientButton icon="share-social-outline" onPress={() => shareVia(TARGETS[3])}>
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
        <Pressable style={styles.optionRow} onPress={() => setShowSettings(value => !value)}>
          <Ionicons name="settings-outline" size={20} color={colors.ink} />
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>Contribution link settings</Text>
            <Text style={styles.optionCopy}>Expiry, max wishes, password</Text>
          </View>
          <Ionicons name={showSettings ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
        </Pressable>
        {showSettings ? (
          <View style={styles.settingsCard}>
            {Platform.OS === 'web' ? (
              <View style={styles.dateBtn}>
                <Ionicons name="calendar-outline" size={18} color={colors.pink} />
                {createElement('input', {
                  type: 'datetime-local',
                  value: expiry ? toLocalInputValue(expiry) : '',
                  min: toLocalInputValue(expiryPickerDefault),
                  onChange: (event: { target: { value: string } }) => {
                    const next = event.target.value ? new Date(event.target.value) : null;
                    setExpiry(next && !Number.isNaN(next.getTime()) ? next : null);
                  },
                  style: {
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    color: colors.ink,
                    fontWeight: '700',
                    fontSize: 13,
                    fontFamily: 'inherit',
                  },
                })}
                {expiry ? (
                  <Pressable onPress={() => setExpiry(null)} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.muted} />
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <>
                <Pressable style={styles.dateBtn} onPress={() => setShowExpiryPicker(true)}>
                  <Ionicons name="calendar-outline" size={18} color={colors.pink} />
                  <Text style={styles.dateText}>
                    {expiry
                      ? `Expires ${expiry.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                      : 'No expiry date'}
                  </Text>
                  {expiry ? (
                    <Pressable onPress={() => setExpiry(null)} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={colors.muted} />
                    </Pressable>
                  ) : null}
                </Pressable>
                {showExpiryPicker ? (
                  <DateTimePicker
                    value={expiry ?? expiryPickerDefault}
                    mode="datetime"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={expiryPickerDefault}
                    onChange={(_, date) => {
                      setShowExpiryPicker(Platform.OS === 'ios');
                      if (date) setExpiry(date);
                    }}
                  />
                ) : null}
              </>
            )}
            <Field
              icon="people-outline"
              placeholder="Max contributions (optional)"
              value={maxWishes}
              onChangeText={text => setMaxWishes(text.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
            />
            <Field
              icon="lock-closed-outline"
              placeholder={invite?.passwordProtected ? 'Set a new password' : 'Password (optional)'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <View style={styles.settingsActions}>
              <GradientButton onPress={saveSettings}>Save settings</GradientButton>
              <Pressable onPress={regenerate} style={styles.linkAction}>
                <Text style={styles.linkActionText}>Regenerate link</Text>
              </Pressable>
              <Pressable onPress={disableLink} style={styles.linkAction}>
                <Text style={[styles.linkActionText, { color: '#D93636' }]}>Disable link</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
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

        <View style={styles.toolRow}>
          <Pressable
            style={styles.toolBtn}
            onPress={() =>
              params.id
                ? router.push({ pathname: '/create/analytics', params: { id: params.id, name: firstName } } as Href)
                : undefined
            }
          >
            <Ionicons name="stats-chart-outline" size={18} color={colors.pink} />
            <Text style={styles.toolText}>Analytics</Text>
          </Pressable>
          <Pressable
            style={styles.toolBtn}
            onPress={() =>
              params.id
                ? router.push({ pathname: '/create/video', params: { id: params.id, name: firstName } } as Href)
                : undefined
            }
          >
            <Ionicons name="videocam-outline" size={18} color={colors.pink} />
            <Text style={styles.toolText}>Auto video</Text>
          </Pressable>
        </View>

        <View style={styles.optionRow}>
          <Ionicons name="people-outline" size={20} color={colors.ink} />
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>Contributors</Text>
            <Text style={styles.optionCopy}>
              {wishes.length ? `${wishes.length} ${wishes.length === 1 ? 'wish' : 'wishes'} received` : 'No wishes yet'}
            </Text>
          </View>
        </View>
        <View style={styles.filters}>
          {FILTERS.map(item => (
            <Chip key={item.id} label={item.label} selected={filter === item.id} onPress={() => setFilter(item.id)} />
          ))}
        </View>
        {visibleWishes.map(wish => (
          <Pressable key={wish.id} style={styles.wish} onPress={() => setMenuWish(wish)}>
            <Avatar name={wish.authorName} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={styles.wishAuthor}>
                {wish.authorName}
                {wish.moderation === 'reported' ? ' · reported' : ''}
              </Text>
              <Text style={styles.wishMessage}>{wish.message}</Text>
              {wish.media?.length ? (
                <Text style={styles.wishMedia}>
                  {wish.media.map(item => item.kind).join(' · ')}
                </Text>
              ) : null}
            </View>
            <Ionicons name="ellipsis-vertical" size={18} color={colors.muted} />
          </Pressable>
        ))}

        <Pressable onPress={() => router.replace('/memories')} style={styles.done}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={Boolean(menuWish)} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuWish(null)}>
          <View style={[styles.menuCard, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.menuTitle}>{menuWish?.authorName}</Text>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                if (menuWish) Alert.alert(menuWish.authorName, menuWish.message);
                setMenuWish(null);
              }}
            >
              <Text style={styles.menuText}>View</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setReportWish(menuWish);
                setMenuWish(null);
              }}
            >
              <Text style={styles.menuText}>Report</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => menuWish && confirmDelete(menuWish)}>
              <Text style={[styles.menuText, { color: '#D93636' }]}>Delete</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(reportWish)} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.reportCard, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.menuTitle}>Report wish</Text>
            <Text style={styles.optionCopy}>Why are you reporting this?</Text>
            {REPORT_REASONS.map(reason => (
              <Pressable
                key={reason.id}
                style={[styles.reasonRow, reportReason === reason.id && styles.reasonOn]}
                onPress={() => setReportReason(reason.id)}
              >
                <Text style={styles.menuText}>{reason.label}</Text>
              </Pressable>
            ))}
            <TextInput
              style={styles.details}
              placeholder="Additional details (optional)"
              placeholderTextColor="#A59BB0"
              value={reportDetails}
              onChangeText={setReportDetails}
              maxLength={500}
              multiline
            />
            <GradientButton onPress={submitReport}>Submit report</GradientButton>
            <Pressable onPress={() => setReportWish(null)} style={styles.done}>
              <Text style={styles.doneText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { backgroundColor: '#22C55E' },
  dotOff: { backgroundColor: '#D93636' },
  statusText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
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
    width: 72,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  targetLabel: { fontSize: 11, color: colors.muted, fontWeight: '600' },
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
  settingsCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginTop: 8,
    gap: 10,
  },
  settingsActions: { gap: 8, marginTop: 4 },
  linkAction: { alignItems: 'center', paddingVertical: 10 },
  linkActionText: { color: colors.pink, fontWeight: '800' },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.soft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateText: { flex: 1, color: colors.ink, fontWeight: '700', fontSize: 13 },
  qr: { alignItems: 'center', padding: 18, backgroundColor: colors.white, borderRadius: 16, marginTop: 10 },
  toolRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
  },
  toolText: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  wish: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  wishAuthor: { color: colors.ink, fontWeight: '800' },
  wishMessage: { color: colors.muted, marginTop: 3, lineHeight: 19 },
  wishMedia: { color: colors.pink, fontSize: 11, fontWeight: '700', marginTop: 4, textTransform: 'capitalize' },
  done: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  doneText: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(23,22,63,0.45)',
    justifyContent: 'flex-end',
  },
  menuCard: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  reportCard: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  menuTitle: { color: colors.ink, fontWeight: '900', fontSize: 20, marginBottom: 8 },
  menuItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  menuText: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  reasonRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 8,
    backgroundColor: colors.white,
  },
  reasonOn: { borderColor: colors.pink, backgroundColor: '#FFF0F7' },
  details: {
    minHeight: 90,
    marginVertical: 12,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    color: colors.ink,
    textAlignVertical: 'top',
  },
});
