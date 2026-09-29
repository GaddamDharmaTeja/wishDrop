import { PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';
import { MediaItem } from '@/lib/types';
import { Visibility } from '@/constants/occasions';

export type CreateDraft = {
  personId: string | null;
  occasion: string;
  recipientName: string;
  title: string;
  message: string;
  media: MediaItem[];
  theme: 'blush' | 'midnight' | 'lavender';
  animation: string;
  visibility: Visibility;
  anonymous: boolean;
  allowWishes: boolean;
  pinEnabled: boolean;
  pin: string;
  scheduleMode: 'now' | 'later';
  opensAt: string | null;
  hours: number;
};

const defaults: CreateDraft = {
  personId: null,
  occasion: 'Birthday',
  recipientName: '',
  title: '',
  message: '',
  media: [],
  theme: 'blush',
  animation: 'hearts',
  visibility: 'link',
  anonymous: false,
  allowWishes: true,
  pinEnabled: false,
  pin: '',
  scheduleMode: 'now',
  opensAt: null,
  hours: 24,
};

type Ctx = {
  draft: CreateDraft;
  setDraft: (patch: Partial<CreateDraft>) => void;
  reset: () => void;
};

const CreateDraftContext = createContext<Ctx | null>(null);

export function CreateDraftProvider({ children }: PropsWithChildren) {
  const [draft, setState] = useState<CreateDraft>(defaults);
  const value = useMemo(
    () => ({
      draft,
      setDraft: (patch: Partial<CreateDraft>) => setState(current => ({ ...current, ...patch })),
      reset: () => setState(defaults),
    }),
    [draft],
  );
  return <CreateDraftContext.Provider value={value}>{children}</CreateDraftContext.Provider>;
}

export function useCreateDraft() {
  const ctx = useContext(CreateDraftContext);
  if (!ctx) throw new Error('useCreateDraft must be used within CreateDraftProvider');
  return ctx;
}
