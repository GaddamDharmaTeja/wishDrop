export type SurpriseStatus = 'draft' | 'scheduled' | 'live' | 'expired';
export type MediaKind = 'image' | 'audio' | 'music';
export type Visibility = 'private' | 'link' | 'public';

export type MediaItem = { id: string; kind: MediaKind; uri: string; name: string };

export type Surprise = {
  id: string;
  title: string;
  occasion: string;
  recipientName: string;
  message: string;
  status: SurpriseStatus;
  opensAt: string;
  expiresAt: string;
  theme: 'blush' | 'midnight' | 'lavender';
  media: MediaItem[];
  reactionCount?: number;
  shareUrl?: string;
  visibility?: Visibility;
  anonymous?: boolean;
  allowWishes?: boolean;
  animation?: string;
  personId?: string;
  wishes?: Wish[];
};

export type PersonGroup = 'family' | 'friend';

export type Person = {
  id: string;
  name: string;
  relationship: string;
  group: PersonGroup;
  birthday: string;
  photoUri?: string;
  notes?: string;
  reminderEnabled: boolean;
};

export type PersonPayload = Omit<Person, 'id'>;

export type Wish = {
  id: string;
  authorName: string;
  message: string;
  media: MediaItem[];
  createdAt?: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  birthday?: string;
  analyticsConsent: boolean;
};

export type CreateSurprisePayload = {
  title: string;
  occasion: string;
  recipientName: string;
  message: string;
  media?: MediaItem[];
  theme?: 'blush' | 'midnight' | 'lavender';
  visibility?: Visibility;
  anonymous?: boolean;
  allowWishes?: boolean;
  animation?: string;
  personId?: string;
};

export type PublishPayload = {
  opensAt: string;
  expiresAt: string;
  pin?: string;
};
