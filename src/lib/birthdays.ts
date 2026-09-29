import { Person } from './types';

const DAY_MS = 86400000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parseBirthday(birthday: string) {
  const [year, month, day] = birthday.split('-').map(Number);
  return { year, month, day };
}

export function toBirthdayString(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function birthdayToDate(birthday: string) {
  const { year, month, day } = parseBirthday(birthday);
  return new Date(year, month - 1, day);
}

export function nextBirthday(birthday: string, from = new Date()) {
  const { month, day } = parseBirthday(birthday);
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let next = new Date(today.getFullYear(), month - 1, day);
  if (next < today) next = new Date(today.getFullYear() + 1, month - 1, day);
  return next;
}

export function daysUntil(birthday: string, from = new Date()) {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((nextBirthday(birthday, from).getTime() - today.getTime()) / DAY_MS);
}

export function formatShort(birthday: string) {
  const { month, day } = parseBirthday(birthday);
  return `${MONTHS[month - 1]} ${day}`;
}

export function formatFull(birthday: string) {
  const { year, month, day } = parseBirthday(birthday);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

export function daysLabel(days: number) {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `in ${days} days`;
}

export function sortUpcoming(people: readonly Person[], from = new Date()) {
  return [...people].sort((a, b) => daysUntil(a.birthday, from) - daysUntil(b.birthday, from));
}
