import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/people-ui';
import { colors } from '@/components/wishdrop-ui';
import { registerForPushNotifications } from '@/lib/push';
import {
  getRemindersEnabled,
  remindersSupported,
  requestReminderPermission,
  setRemindersEnabled,
} from '@/lib/reminders';
import { usePeople } from '@/providers/people-provider';

function SettingRow({
  title,
  copy,
  value,
  onChange,
  disabled,
}: Readonly<{ title: string; copy: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean }>) {
  return (
    <View style={styles.setting}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingCopy}>{copy}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: colors.pink }} />
    </View>
  );
}

export default function NotificationSettings() {
  const insets = useSafeAreaInsets();
  const { people, resyncReminders } = usePeople();
  const [reminders, setReminders] = useState(false);
  const [push, setPush] = useState(false);

  useEffect(() => {
    if (!remindersSupported) return;
    void Promise.all([getRemindersEnabled(), Notifications.getPermissionsAsync()]).then(([enabled, permission]) =>
      setReminders(enabled && permission.granted),
    );
  }, []);

  const toggleReminders = async (value: boolean) => {
    setReminders(value);
    if (value && !(await requestReminderPermission())) {
      setReminders(false);
      Alert.alert('Notifications are off', 'Allow notifications for WishDrop in your phone settings to get birthday reminders.');
      return;
    }
    await setRemindersEnabled(value);
    await resyncReminders();
  };

  const togglePush = async (value: boolean) => {
    setPush(value);
    if (!value) return;
    const token = await registerForPushNotifications();
    if (!token) {
      setPush(false);
      Alert.alert('Notifications', 'Permission was not granted, or push is unavailable on this device.');
      return;
    }
    Alert.alert('Notifications on', 'Push token registered. Delivery activates when Expo Push is configured on the server.');
  };

  const reminderCount = people.filter(person => person.reminderEnabled).length;

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.page}>
        <ScreenHeader title="Reminders & Notifications" />
        <SettingRow
          title="Birthday reminders"
          copy={
            remindersSupported
              ? `A reminder the day before and on the day, at 9:00. ${reminderCount} ${reminderCount === 1 ? 'person' : 'people'} with reminders on.`
              : 'Birthday reminders are available in the iOS and Android app.'
          }
          value={reminders}
          onChange={toggleReminders}
          disabled={!remindersSupported}
        />
        <SettingRow
          title="Surprise notifications"
          copy="Opening, expiry, and delivery status."
          value={push}
          onChange={togglePush}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  page: { flex: 1, paddingHorizontal: 20 },
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 18,
    marginTop: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  settingTitle: { color: colors.ink, fontWeight: '800' },
  settingCopy: { color: colors.muted, fontSize: 12, marginTop: 3, lineHeight: 17 },
});
