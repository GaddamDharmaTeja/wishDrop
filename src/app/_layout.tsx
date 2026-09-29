import * as Notifications from 'expo-notifications';
import { Stack, router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { AuthProvider } from '@/providers/auth-provider';
import { CreateDraftProvider } from '@/providers/create-draft-provider';
import { PeopleProvider } from '@/providers/people-provider';

function NotificationRouter() {
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const url = response?.notification.request.content.data?.url;
    if (typeof url === 'string' && response?.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      router.push(url as Href);
      void Notifications.clearLastNotificationResponseAsync();
    }
  }, [response]);
  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <PeopleProvider>
        <CreateDraftProvider>
          <StatusBar style="dark" />
          {Platform.OS === 'web' ? null : <NotificationRouter />}
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
        </CreateDraftProvider>
      </PeopleProvider>
    </AuthProvider>
  );
}
