import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, ScreenHeader, SegmentTabs } from '@/components/people-ui';
import { Chip, Field, GradientButton, OutlineButton, colors } from '@/components/wishdrop-ui';
import { GROUP_LABELS, NOTES_LIMIT, RELATIONSHIPS } from '@/constants/people';
import { api } from '@/lib/api';
import { birthdayToDate, formatFull, toBirthdayString } from '@/lib/birthdays';
import { Person, PersonGroup } from '@/lib/types';
import { usePeople } from '@/providers/people-provider';

export default function EditPersonScreen() {
  const params = useLocalSearchParams<{ id?: string; group?: string }>();
  const { getPerson, loading } = usePeople();
  const existing = getPerson(params.id);

  if (params.id && !existing) {
    return (
      <View style={[styles.safe, styles.center]}>
        {loading ? (
          <ActivityIndicator color={colors.pink} />
        ) : (
          <>
            <Text style={styles.label}>This person is no longer saved.</Text>
            <OutlineButton onPress={() => router.back()}>Go back</OutlineButton>
          </>
        )}
      </View>
    );
  }
  return (
    <PersonForm key={existing?.id ?? 'new'} existing={existing} defaultGroup={params.group === 'friend' ? 'friend' : 'family'} />
  );
}

function PersonForm({ existing, defaultGroup }: Readonly<{ existing?: Person; defaultGroup: PersonGroup }>) {
  const insets = useSafeAreaInsets();
  const { addPerson, updatePerson, removePerson } = usePeople();
  const initialGroup: PersonGroup = existing?.group ?? defaultGroup;

  const [group, setGroup] = useState<PersonGroup>(initialGroup);
  const [name, setName] = useState(existing?.name ?? '');
  const [relationship, setRelationship] = useState(existing?.relationship ?? '');
  const [birthday, setBirthday] = useState<string | null>(existing?.birthday ?? null);
  const [photoUri, setPhotoUri] = useState(existing?.photoUri);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [reminderEnabled, setReminderEnabled] = useState(existing?.reminderEnabled ?? true);
  const [showPicker, setShowPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const changeGroup = (next: PersonGroup) => {
    setGroup(next);
    if (!RELATIONSHIPS[next].includes(relationship)) setRelationship('');
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const { media } = await api.uploadMedia(asset.uri, 'image', asset.fileName ?? 'photo.jpg');
      setPhotoUri(media.uri);
    } catch (error) {
      Alert.alert('Photo not uploaded', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!name.trim() || !relationship || !birthday) {
      Alert.alert('Almost there', 'Add a name, relationship, and date of birth.');
      return;
    }
    const payload = {
      name: name.trim(),
      relationship,
      group,
      birthday,
      photoUri,
      notes: notes.trim() || undefined,
      reminderEnabled,
    };
    setSaving(true);
    try {
      if (existing) await updatePerson(existing.id, payload);
      else await addPerson(payload);
      router.back();
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!existing) return;
    Alert.alert(`Remove ${existing.name}?`, 'Their birthday reminders will stop too.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removePerson(existing.id);
            router.back();
          } catch (error) {
            Alert.alert('Could not remove', error instanceof Error ? error.message : 'Try again.');
          }
        },
      },
    ]);
  };

  const title = existing ? `Edit ${GROUP_LABELS[group].singular}` : `Add ${GROUP_LABELS[group].singular}`;

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader title={title} />

        <Pressable onPress={pickPhoto} style={styles.photo} accessibilityLabel="Choose photo">
          <Avatar name={name || '?'} uri={photoUri} size={104} />
          <View style={styles.camera}>
            {uploading ? (
              <ActivityIndicator size="small" color={colors.pink} />
            ) : (
              <Ionicons name="camera" size={16} color={colors.ink} />
            )}
          </View>
        </Pressable>

        <SegmentTabs
          options={[
            { key: 'family', label: 'Family' },
            { key: 'friend', label: 'Friend' },
          ]}
          value={group}
          onChange={changeGroup}
        />

        <Text style={styles.label}>
          Name <Text style={styles.required}>*</Text>
        </Text>
        <Field placeholder="Full name" value={name} onChangeText={setName} autoCapitalize="words" />

        <Text style={styles.label}>
          Relationship <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.chips}>
          {RELATIONSHIPS[group].map(item => (
            <Chip key={item} label={item} selected={relationship === item} onPress={() => setRelationship(item)} />
          ))}
        </View>

        <Text style={styles.label}>
          Date of Birth <Text style={styles.required}>*</Text>
        </Text>
        <Pressable onPress={() => setShowPicker(true)}>
          <View pointerEvents="none">
            <Field
              icon="calendar-outline"
              placeholder="DD/MM/YYYY"
              value={birthday ? formatFull(birthday) : ''}
              editable={false}
            />
          </View>
        </Pressable>
        {showPicker ? (
          <DateTimePicker
            value={birthday ? birthdayToDate(birthday) : new Date(1995, 0, 1)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={(_, date) => {
              setShowPicker(Platform.OS === 'ios');
              if (date) setBirthday(toBirthdayString(date));
            }}
          />
        ) : null}

        <View style={styles.reminder}>
          <Text style={styles.reminderText}>Set yearly reminder</Text>
          <Switch value={reminderEnabled} onValueChange={setReminderEnabled} trackColor={{ true: colors.pink }} />
        </View>

        <View>
          <Field
            placeholder="Notes (optional)"
            value={notes}
            onChangeText={text => setNotes(text.slice(0, NOTES_LIMIT))}
            multiline
          />
          <Text style={styles.counter}>
            {notes.length}/{NOTES_LIMIT}
          </Text>
        </View>

        <View style={{ marginTop: 22 }}>
          <GradientButton onPress={save} disabled={saving || uploading}>
            {saving ? 'Saving…' : 'Save'}
          </GradientButton>
        </View>
        {existing ? <OutlineButton onPress={remove}>Remove {existing.name}</OutlineButton> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  page: { paddingHorizontal: 20 },
  photo: { alignSelf: 'center', marginVertical: 8 },
  camera: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: colors.ink, fontWeight: '800', marginTop: 14 },
  required: { color: colors.pink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  reminder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  reminderText: { color: colors.ink, fontWeight: '700' },
  counter: { position: 'absolute', right: 12, bottom: 10, color: colors.muted, fontSize: 11 },
});
