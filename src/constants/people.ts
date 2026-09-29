import { PersonGroup } from '@/lib/types';

export const RELATIONSHIPS: Record<PersonGroup, readonly string[]> = {
  family: ['Mother', 'Father', 'Brother', 'Sister', 'Spouse', 'Son', 'Daughter', 'Grandparent', 'Cousin', 'Relative'],
  friend: ['Friend', 'Best friend', 'Colleague', 'Classmate', 'Neighbour'],
};

export const GROUP_LABELS: Record<PersonGroup, { singular: string; plural: string }> = {
  family: { singular: 'Family Member', plural: 'Family' },
  friend: { singular: 'Friend', plural: 'Friends' },
};

export const NOTES_LIMIT = 200;
