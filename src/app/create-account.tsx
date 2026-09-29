import DateTimePicker from '@react-native-community/datetimepicker';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
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
  SocialIconButton,
  colors,
} from '@/components/wishdrop-ui';
import { useAuth } from '@/providers/auth-provider';

function formatDob(date: Date) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CreateAccount() {
  const insets = useSafeAreaInsets();
  const { signUp, signInWithProvider, user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!agreed) return Alert.alert('Please agree', 'Accept the Terms of Service and Privacy Policy to continue.');
    if (!name || !email || password.length < 8) {
      return Alert.alert('Check your details', 'Enter your name, a valid email, and an 8-character password.');
    }
    try {
      setBusy(true);
      await signUp({
        name,
        email: email.trim(),
        password,
        birthday: birthday ? birthday.toISOString().slice(0, 10) : undefined,
        analyticsConsent: agreed,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Try again.';
      Alert.alert(
        message.includes('already exists') ? 'Account already exists' : 'Could not create account',
        message.includes('already exists')
          ? 'Please use Log In with this email and password.'
          : message,
      );
    } finally {
      setBusy(false);
    }
  };

  if (user) return <Redirect href="/home" />;

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={colors.ink} />
          </Pressable>
          <Brand size="sm" />
          <Pressable onPress={() => router.replace('/login')}>
            <Text style={styles.loginLink}>Log In</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.copy}>Start creating beautiful surprises for the people you love. ❤️</Text>

        <Field icon="person-outline" placeholder="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
        <Field
          icon="mail-outline"
          placeholder="Email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Field
          icon="lock-closed-outline"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          right={
            <Pressable onPress={() => setShowPassword(v => !v)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
            </Pressable>
          }
        />
        <Pressable onPress={() => setShowPicker(true)}>
          <View pointerEvents="none">
            <Field
              icon="calendar-outline"
              placeholder="Date of birth (optional)"
              value={birthday ? formatDob(birthday) : ''}
              editable={false}
              right={<Ionicons name="calendar-outline" size={18} color={colors.muted} />}
            />
          </View>
        </Pressable>
        {showPicker ? (
          <DateTimePicker
            value={birthday ?? new Date(1999, 2, 27)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={(_, date) => {
              setShowPicker(Platform.OS === 'ios');
              if (date) setBirthday(date);
            }}
          />
        ) : null}

        <View style={{ marginTop: 18 }}>
          <GradientButton disabled={busy} onPress={submit}>
            {busy ? 'Creating…' : 'Create Account →'}
          </GradientButton>
        </View>

        <Text style={styles.or}>— or continue with —</Text>
        <View style={styles.socialRow}>
          <SocialIconButton label="Google" onPress={() => signInWithProvider('google')}>
            <GoogleGlyph />
          </SocialIconButton>
          <SocialIconButton label="Apple" onPress={() => signInWithProvider('apple')}>
            <Ionicons name="logo-apple" size={22} color={colors.ink} />
          </SocialIconButton>
          <SocialIconButton label="Phone" onPress={() => signInWithProvider('phone')}>
            <Ionicons name="call-outline" size={22} color={colors.ink} />
          </SocialIconButton>
        </View>

        <Pressable style={styles.consent} onPress={() => setAgreed(v => !v)}>
          <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
            {agreed ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
          </View>
          <Text style={styles.consentText}>
            I agree to the <Text style={styles.link}>Terms of Service</Text> and{' '}
            <Text style={styles.link}>Privacy Policy</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: 24, paddingBottom: 40 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    minHeight: 40,
  },
  loginLink: { color: colors.pink, fontWeight: '800', fontSize: 15 },
  title: { fontSize: 28, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  copy: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 8,
  },
  or: { textAlign: 'center', color: colors.muted, marginVertical: 18, fontSize: 13 },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 14 },
  consent: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 22, gap: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: colors.pink, borderColor: colors.pink },
  consentText: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 19 },
  link: { color: colors.pink, fontWeight: '700' },
});
