export type OccasionCategory = 'all' | 'celebrate' | 'express' | 'justBecause';

export type Occasion = {
  id: string;
  label: string;
  emoji: string;
  category: Exclude<OccasionCategory, 'all'>;
  assetKey: string;
};

export const OCCASIONS: Occasion[] = [
  { id: 'birthday', label: 'Birthday', emoji: '🎂', category: 'celebrate', assetKey: 'birthday' },
  { id: 'proposal', label: 'Proposal', emoji: '💍', category: 'celebrate', assetKey: 'proposal' },
  { id: 'anniversary', label: 'Anniversary', emoji: '💕', category: 'celebrate', assetKey: 'anniversary' },
  { id: 'congratulations', label: 'Congratulations', emoji: '🎉', category: 'celebrate', assetKey: 'congratulations' },
  { id: 'graduation', label: 'Graduation', emoji: '🎓', category: 'celebrate', assetKey: 'graduation' },
  { id: 'farewell', label: 'Farewell', emoji: '✈️', category: 'express', assetKey: 'farewell' },
  { id: 'wedding', label: 'Wedding', emoji: '💐', category: 'celebrate', assetKey: 'wedding' },
  { id: 'thank-you', label: 'Thank You', emoji: '🙏', category: 'express', assetKey: 'thank-you' },
  { id: 'just-because', label: 'Just Because', emoji: '✨', category: 'justBecause', assetKey: 'just-because' },
  { id: 'new-baby', label: 'New Baby', emoji: '🧸', category: 'celebrate', assetKey: 'new-baby' },
];

export const OCCASION_FILTERS: { id: OccasionCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'celebrate', label: 'Celebrate' },
  { id: 'express', label: 'Express' },
  { id: 'justBecause', label: 'Just Because' },
];

export const TEMPLATES = [
  { id: 'blush', label: 'Blush', colors: ['#FFE4F1', '#FF9EC8'] as const },
  { id: 'midnight', label: 'Midnight', colors: ['#2A1B4A', '#6B3FA0'] as const },
  { id: 'lavender', label: 'Lavender', colors: ['#E8D9FF', '#B794F6'] as const },
] as const;

export const ANIMATIONS = [
  { id: 'fireworks', label: 'Fireworks', emoji: '🎆' },
  { id: 'hearts', label: 'Hearts', emoji: '💗' },
  { id: 'butterflies', label: 'Butterflies', emoji: '🦋' },
  { id: 'confetti', label: 'Confetti', emoji: '🎊' },
  { id: 'sparkles', label: 'Sparkles', emoji: '✨' },
  { id: 'none', label: 'None', emoji: '○' },
] as const;

export const DURATION_OPTIONS = [
  { hours: 1, label: '1 hour' },
  { hours: 6, label: '6 hours' },
  { hours: 24, label: '24 hours' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '7 days' },
] as const;

export type Visibility = 'private' | 'link' | 'public';

export const VISIBILITY_OPTIONS: { id: Visibility; title: string; subtitle: string }[] = [
  { id: 'private', title: 'Private', subtitle: 'Only invited' },
  { id: 'link', title: 'Link only', subtitle: 'Anyone with link' },
  { id: 'public', title: 'Public', subtitle: 'Anyone can view' },
];
