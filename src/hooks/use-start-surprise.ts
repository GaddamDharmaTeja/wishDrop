import { router } from 'expo-router';
import { useCallback } from 'react';
import { Person } from '@/lib/types';
import { useCreateDraft } from '@/providers/create-draft-provider';

export function birthdayMessage(person: Pick<Person, 'name'>) {
  const firstName = person.name.split(' ')[0];
  return `Happy Birthday, ${firstName}!\nWishing you lots of happiness and success!`;
}

export function useStartSurprise() {
  const { reset, setDraft } = useCreateDraft();

  return useCallback(
    (person: Person, occasion = 'Birthday') => {
      const firstName = person.name.split(' ')[0];
      reset();
      setDraft({
        personId: person.id,
        recipientName: person.name,
        occasion,
        title: `${firstName}'s ${occasion} Surprise`,
        message: occasion === 'Birthday' ? birthdayMessage(person) : '',
      });
      router.push('/create/compose');
    },
    [reset, setDraft],
  );
}
