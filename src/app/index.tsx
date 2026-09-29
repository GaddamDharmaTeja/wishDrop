import { Redirect } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';

export default function Index() {
  const { status, user } = useAuth();
  if (status === 'loading') return null;
  return <Redirect href={user ? '/home' : '/welcome'} />;
}
