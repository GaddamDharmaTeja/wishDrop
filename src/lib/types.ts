export type SurpriseStatus = 'draft' | 'scheduled' | 'live' | 'expired';
export type MediaKind = 'image' | 'audio' | 'music' | 'video';
export type Visibility = 'private' | 'link' | 'public';
export type WishStyle = 'emotional' | 'funny' | 'sweet' | 'respectful' | 'casual';
export type ReportReason = 'inappropriate' | 'spam' | 'harassment' | 'offensive' | 'other';
export type VideoStyle = 'classic' | 'emotional' | 'fun' | 'minimal';

export type MediaItem = { id: string; kind: MediaKind; uri: string; name: string };

export type InviteSettings = {
  enabled: boolean;
  status: 'active' | 'disabled' | 'expired';
  expiresAt: string | null;
  maxWishes: number | null;
  passwordProtected: boolean;
};

export type VideoReel = {
  style: VideoStyle;
  includeMusic: boolean;
  includeNames: boolean;
  durationSec: number;
  status: 'idle' | 'ready';
  generatedAt?: string;
};

export type SurpriseStats = {
  wishes: number;
  photos: number;
  videos: number;
  voice: number;
  music: number;
  reactions?: number;
  opened?: boolean;
};

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
  keepSurprise?: boolean;
  animation?: string;
  personId?: string;
  openedAt?: string;
  wishes?: Wish[];
  invite?: InviteSettings;
  videoReel?: VideoReel;
  stats?: SurpriseStats;
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
  moderation?: 'visible' | 'hidden' | 'reported';
  createdAt?: string;
};

export type AnalyticsActivity = {
  id: string;
  type: 'wish' | 'opened';
  at: string;
  label: string;
};

export type SurpriseAnalytics = {
  stats: SurpriseStats;
  activity: AnalyticsActivity[];
  invite: InviteSettings;
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
  keepSurprise?: boolean;
  animation?: string;
  personId?: string;
};

export type PublishPayload = {
  opensAt: string;
  expiresAt: string;
  pin?: string;
};

export type InviteSettingsPayload = {
  expiresAt?: string | null;
  maxWishes?: number | null;
  password?: string | null;
  enabled?: boolean;
};

export type ContributeInfo = {
  recipientName: string;
  occasion: string;
  title: string;
  passwordRequired: boolean;
  styles: WishStyle[];
};
