import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { parseBirthday, sortUpcoming } from './birthdays';
import './push';
import { Person } from './types';

const PREF_KEY = 'wishdrop.birthday-reminders';
const ID_PREFIX = 'birthday-';
const CHANNEL_ID = 'birthdays';
const REMINDER_HOUR = 9;
// iOS keeps at most 64 pending local notifications; each person uses two.
const MAX_PEOPLE = 30;

export const remindersSupported = Platform.OS !== 'web';

export async function getRemindersEnabled() {
  return (await AsyncStorage.getItem(PREF_KEY)) !== 'off';
}

export async function setRemindersEnabled(enabled: boolean) {
  await AsyncStorage.setItem(PREF_KEY, enabled ? 'on' : 'off');
}

export async function requestReminderPermission() {
  if (!remindersSupported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Birthday reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

async function cancelBirthdayReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(item => item.identifier.startsWith(ID_PREFIX))
      .map(item => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

function reminderDate(birthday: string, daysBefore: number) {
  const { month, day } = parseBirthday(birthday);
  const safeDay = month === 2 && day === 29 ? 28 : day;
  return new Date(2001, month - 1, safeDay - daysBefore);
}

async function scheduleFor(person: Person, daysBefore: number) {
  const date = reminderDate(person.birthday, daysBefore);
  const firstName = person.name.split(' ')[0];
  const body =
    daysBefore === 0
      ? `It's ${firstName}'s birthday today. Send a surprise they'll never forget.`
      : `${firstName}'s birthday is tomorrow. Create a surprise now.`;
  await Notifications.scheduleNotificationAsync({
    identifier: `${ID_PREFIX}${person.id}-${daysBefore}`,
    content: {
      title: daysBefore === 0 ? `Happy birthday, ${firstName}!` : `${firstName}'s birthday is coming up`,
      body,
      data: { url: `/create/for?personId=${person.id}&occasion=Birthday` },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.YEARLY,
      month: date.getMonth(),
      day: date.getDate(),
      hour: REMINDER_HOUR,
      minute: 0,
      channelId: CHANNEL_ID,
    },
  });
}

export async function syncBirthdayReminders(people: readonly Person[]) {
  if (!remindersSupported) return;
  try {
    await cancelBirthdayReminders();
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted || !(await getRemindersEnabled())) return;
    await ensureChannel();
    const targets = sortUpcoming(people.filter(person => person.reminderEnabled)).slice(0, MAX_PEOPLE);
    await Promise.all(targets.flatMap(person => [scheduleFor(person, 1), scheduleFor(person, 0)]));
  } catch {
    /* scheduling is best-effort; the in-app list still shows upcoming birthdays */
  }
}
