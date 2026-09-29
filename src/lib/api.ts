import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { File, UploadType } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  CreateSurprisePayload,
  MediaItem,
  Person,
  PersonPayload,
  PublishPayload,
  Surprise,
  User,
  Wish,
} from './types';

const apiUrl = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/v1';
const ACCESS_KEY = 'wishdrop.access-token';
const REFRESH_KEY = 'wishdrop.refresh-token';

const tokenStore =
  Platform.OS === 'web'
    ? AsyncStorage
    : {
        getItem: SecureStore.getItemAsync,
        setItem: SecureStore.setItemAsync,
        removeItem: SecureStore.deleteItemAsync,
      };

let accessToken: string | null = null;
let refreshToken: string | null = null;
let hydratePromise: Promise<void> | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export const getApiUrl = () => apiUrl;

export async function hydrateTokens() {
  if (!hydratePromise) {
    hydratePromise = (async () => {
      accessToken = await tokenStore.getItem(ACCESS_KEY);
      refreshToken = await tokenStore.getItem(REFRESH_KEY);
    })();
  }
  await hydratePromise;
}

export async function getRefreshToken() {
  await hydrateTokens();
  return refreshToken;
}

export async function setSessionTokens(tokens: { accessToken: string; refreshToken: string } | null) {
  if (!tokens) {
    accessToken = null;
    refreshToken = null;
    await Promise.all([tokenStore.removeItem(ACCESS_KEY), tokenStore.removeItem(REFRESH_KEY)]);
    return;
  }
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  await Promise.all([
    tokenStore.setItem(ACCESS_KEY, tokens.accessToken),
    tokenStore.setItem(REFRESH_KEY, tokens.refreshToken),
  ]);
}

/** @deprecated use setSessionTokens — kept for call sites during transition */
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    await hydrateTokens();
    if (!refreshToken) return false;
    try {
      const response = await fetch(`${apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        await setSessionTokens(null);
        return false;
      }
      await setSessionTokens({ accessToken: body.accessToken, refreshToken: body.refreshToken });
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function request<T>(path: string, options: RequestInit = {}, allowRetry = true): Promise<T> {
  await hydrateTokens();

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      `Cannot reach the WishDrop API at ${apiUrl}. Start the server (npm run dev in server/) and check EXPO_PUBLIC_API_URL.`,
    );
  }

  const body = await response.json().catch(() => ({} as { message?: string }));

  if (response.status === 401 && allowRetry && !path.startsWith('/auth/')) {
    const refreshed = await refreshSession();
    if (refreshed) return request<T>(path, options, false);
  }

  if (!response.ok) {
    const message =
      typeof body.message === 'string' && body.message.length > 0
        ? body.message
        : response.status === 401
          ? 'Session expired. Please sign in again.'
          : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}

export type AuthResult = { user: User; accessToken: string; refreshToken: string };

export const api = {
  login: (email: string, password: string) =>
    request<AuthResult>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (payload: {
    name: string;
    email: string;
    password: string;
    birthday?: string;
    analyticsConsent: boolean;
  }) => request<AuthResult>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  refresh: (token: string) =>
    request<AuthResult>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: token }) }, false),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  oauthStub: (provider: 'google' | 'apple' | 'phone') =>
    request<{ enabled: boolean; message: string }>('/auth/oauth/' + provider, { method: 'POST' }),
  surprises: () => request<{ surprises: Surprise[] }>('/surprises'),
  createSurprise: (payload: CreateSurprisePayload) =>
    request<{ surprise: Surprise }>('/surprises', { method: 'POST', body: JSON.stringify(payload) }),
  publish: (id: string, payload: PublishPayload) =>
    request<{ surprise: Surprise }>(`/surprises/${id}/publish`, { method: 'POST', body: JSON.stringify(payload) }),
  share: (id: string) => request<{ url: string }>(`/surprises/${id}/share`, { method: 'POST' }),
  invite: (id: string) => request<{ url: string }>(`/surprises/${id}/invite`, { method: 'POST' }),
  wishes: (id: string) => request<{ wishes: Wish[] }>(`/surprises/${id}/wishes`),
  people: () => request<{ people: Person[] }>('/people'),
  createPerson: (payload: PersonPayload) =>
    request<{ person: Person }>('/people', { method: 'POST', body: JSON.stringify(payload) }),
  updatePerson: (id: string, payload: Partial<PersonPayload>) =>
    request<{ person: Person }>(`/people/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deletePerson: (id: string) => request<{ ok: boolean }>(`/people/${id}`, { method: 'DELETE' }),
  contributeInfo: (token: string) =>
    request<{ recipientName: string; occasion: string; title: string }>(`/public/contribute/${token}`),
  contribute: (token: string, authorName: string, message: string) =>
    request<{ wish: Wish }>(`/public/contribute/${token}`, {
      method: 'POST',
      body: JSON.stringify({ authorName, message }),
    }),
  publicSurprise: (token: string, pin?: string) =>
    request<{ surprise: Surprise }>(`/public/surprises/${token}`, {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),
  react: (token: string, emoji: string, message?: string) =>
    request<{ ok: boolean }>(`/public/surprises/${token}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji, message }),
    }),
  presignUpload: (payload: { contentType: string; byteLength: number; checksum: string }) =>
    request<{
      upload: { enabled: boolean; reason?: string; uploadUrl?: string; publicUrl?: string };
    }>('/uploads/presign', { method: 'POST', body: JSON.stringify(payload) }),
  uploadMedia: async (
    localUri: string,
    kind: 'image' | 'audio',
    name: string,
  ): Promise<{ media: MediaItem }> => {
    await hydrateTokens();
    const mime = kind === 'audio' ? 'audio/mp4' : 'image/jpeg';
    const filename = kind === 'audio' ? 'voice.m4a' : 'photo.jpg';
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

    let status = 0;
    let body: { message?: string; media?: MediaItem } = {};
    try {
      if (Platform.OS === 'web') {
        const form = new FormData();
        const blob = await (await fetch(localUri)).blob();
        form.append('file', blob, filename);
        const response = await fetch(`${apiUrl}/uploads/file`, { method: 'POST', headers, body: form });
        status = response.status;
        body = await response.json().catch(() => ({}));
      } else {
        const result = await new File(localUri).upload(`${apiUrl}/uploads/file`, {
          uploadType: UploadType.MULTIPART,
          fieldName: 'file',
          mimeType: mime,
          headers,
          sessionType: 'foreground',
        });
        status = result.status;
        body = JSON.parse(result.body || '{}') as { message?: string; media?: MediaItem };
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Network request failed';
      throw new Error(`Could not upload media to ${apiUrl}. ${reason}`);
    }

    if (status === 401) {
      const refreshed = await refreshSession();
      if (refreshed) return api.uploadMedia(localUri, kind, name);
    }

    if (status < 200 || status >= 300 || !body.media) {
      throw new Error(body.message ?? `Upload failed (${status})`);
    }
    return { media: body.media };
  },
  registerPushToken: (token: string) =>
    request<{ ok: boolean; enabled: boolean }>('/devices/push', {
      method: 'POST',
      body: JSON.stringify({ token, platform: Constants.platform?.ios ? 'ios' : 'android' }),
    }),
};
