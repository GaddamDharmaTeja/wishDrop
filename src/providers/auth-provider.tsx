import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { api, getRefreshToken, setSessionTokens } from '@/lib/api';
import { User } from '@/lib/types';

type AuthContextValue = {
  user: User | null;
  status: 'loading' | 'ready';
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: {
    name: string;
    email: string;
    password: string;
    birthday?: string;
    analyticsConsent: boolean;
  }) => Promise<void>;
  signInWithProvider: (provider: 'google' | 'apple' | 'phone') => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');

  const persist = async (result: { user: User; accessToken: string; refreshToken: string }) => {
    await setSessionTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    setUser(result.user);
  };

  useEffect(() => {
    (async () => {
      try {
        const refresh = await getRefreshToken();
        if (refresh) await persist(await api.refresh(refresh));
      } catch {
        await setSessionTokens(null);
      } finally {
        setStatus('ready');
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      signIn: async (email, password) => persist(await api.login(email, password)),
      signUp: async payload => persist(await api.register(payload)),
      signInWithProvider: async provider => {
        try {
          const result = await api.oauthStub(provider);
          Alert.alert(
            result.enabled ? 'Continue' : 'Almost ready',
            result.message ||
              `Add ${provider} credentials in server/.env to enable this sign-in method.`,
          );
        } catch (error) {
          Alert.alert(
            'Sign-in unavailable',
            error instanceof Error
              ? error.message
              : `Configure ${provider} OAuth credentials to enable this option.`,
          );
        }
      },
      signOut: async () => {
        try {
          await api.logout();
        } catch {
          /* session may already be gone */
        }
        await setSessionTokens(null);
        setUser(null);
      },
    }),
    [user, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
