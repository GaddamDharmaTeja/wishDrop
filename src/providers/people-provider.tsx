import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { requestReminderPermission, syncBirthdayReminders } from '@/lib/reminders';
import { Person, PersonPayload } from '@/lib/types';
import { useAuth } from './auth-provider';

type PeopleContextValue = {
  people: Person[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addPerson: (payload: PersonPayload) => Promise<Person>;
  updatePerson: (id: string, payload: Partial<PersonPayload>) => Promise<Person>;
  removePerson: (id: string) => Promise<void>;
  getPerson: (id?: string) => Person | undefined;
  resyncReminders: () => Promise<void>;
};

const PeopleContext = createContext<PeopleContextValue | null>(null);

export function PeopleProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [people, setPeople] = useState<Person[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((next: Person[]) => {
    setPeople(next);
    void syncBirthdayReminders(next);
  }, []);

  const load = useCallback(
    (forUser: string, isActive: () => boolean = () => true) =>
      api
        .people()
        .then(result => {
          if (!isActive()) return;
          apply(result.people);
          setError(null);
        })
        .catch(err => {
          if (isActive()) setError(err instanceof Error ? err.message : 'Could not load your people.');
        })
        .finally(() => {
          if (isActive()) setLoadedFor(forUser);
        }),
    [apply],
  );

  useEffect(() => {
    if (!userId) {
      void syncBirthdayReminders([]);
      return;
    }
    let active = true;
    void load(userId, () => active);
    return () => {
      active = false;
    };
  }, [userId, load]);

  const visiblePeople = useMemo(() => (userId && loadedFor === userId ? people : []), [people, userId, loadedFor]);
  const loading = Boolean(userId) && loadedFor !== userId;

  const refresh = useCallback(async () => {
    if (userId) await load(userId);
  }, [userId, load]);

  const value = useMemo<PeopleContextValue>(
    () => ({
      people: visiblePeople,
      loading,
      error,
      refresh,
      addPerson: async payload => {
        if (payload.reminderEnabled) await requestReminderPermission();
        const { person } = await api.createPerson(payload);
        apply([...people, person]);
        return person;
      },
      updatePerson: async (id, payload) => {
        if (payload.reminderEnabled) await requestReminderPermission();
        const { person } = await api.updatePerson(id, payload);
        apply(people.map(item => (item.id === id ? person : item)));
        return person;
      },
      removePerson: async id => {
        await api.deletePerson(id);
        apply(people.filter(item => item.id !== id));
      },
      getPerson: id => people.find(item => item.id === id),
      resyncReminders: () => syncBirthdayReminders(people),
    }),
    [people, visiblePeople, loading, error, refresh, apply],
  );

  return <PeopleContext.Provider value={value}>{children}</PeopleContext.Provider>;
}

export function usePeople() {
  const context = useContext(PeopleContext);
  if (!context) throw new Error('usePeople must be used within PeopleProvider');
  return context;
}
