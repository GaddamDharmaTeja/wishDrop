import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Brand,
  Field,
  GoogleGlyph,
  GradientButton,
  OutlineButton,
  colors,
} from '@/components/wishdrop-ui';
import { useAuth } from '@/providers/auth-provider';

export default function Login() {
  const insets = useSafeAreaInsets();
  const { signIn, signInWithProvider, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email || !password) return Alert.alert('Enter your email and password');
    try {
      setBusy(true);
      await signIn(email.trim(), password);
    } catch (error) {
      Alert.alert('Could not sign in', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (user) return <Redirect href="/home" />;

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="chevron-back" size={26} color={colors.ink} />
            </Pressable>
            <Brand size="sm" />
            <Pressable onPress={() => router.replace('/create-account')}>
              <Text style={styles.link}>Sign up</Text>
            </Pressable>
          </View>

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.copy}>Sign in to continue creating beautiful surprises.</Text>

          <Field
            icon="mail-outline"
            placeholder="Email address"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Field
            icon="lock-closed-outline"
            placeholder="Password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            right={
              <Pressable onPress={() => setShowPassword(v => !v)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
              </Pressable>
            }
          />

          <Text style={[styles.link, { alignSelf: 'flex-end', marginTop: 12, marginBottom: 18 }]}>
            Forgot password?
          </Text>

          <GradientButton disabled={busy} onPress={submit}>
            {busy ? 'Signing in…' : 'Log In →'}
          </GradientButton>

          <Text style={styles.or}>— or continue with —</Text>
          <OutlineButton icon={<GoogleGlyph />} onPress={() => signInWithProvider('google')}>
            Continue with Google
          </OutlineButton>
          <OutlineButton
            icon={<Ionicons name="logo-apple" size={20} color={colors.ink} />}
            onPress={() => signInWithProvider('apple')}
          >
            Continue with Apple
          </OutlineButton>

          <Text onPress={() => router.replace('/create-account')} style={styles.footer}>
            New to WishDrop? <Text style={styles.link}>Create account</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: 24, paddingBottom: 32, flexGrow: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  title: { fontSize: 30, fontWeight: '900', color: colors.ink },
  copy: { color: colors.muted, fontSize: 15, marginTop: 8, marginBottom: 8, lineHeight: 22 },
  link: { color: colors.pink, fontWeight: '800' },
  or: { textAlign: 'center', color: colors.muted, marginVertical: 16, fontSize: 13 },
  footer: { color: colors.muted, textAlign: 'center', marginTop: 28 },
});
