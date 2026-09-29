import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Brand,
  GoogleGlyph,
  GradientButton,
  OutlineButton,
  colors,
  gradients,
} from '@/components/wishdrop-ui';
import { brandAsset, hasBrandAsset } from '@/lib/assets';
import { useAuth } from '@/providers/auth-provider';

const slides = [
  {
    title: 'One moment. Everyone you love.',
    copy: 'Create beautiful surprises with family and friends. Make it special. Let it live for a little while.',
  },
  {
    title: 'Photos, voice, music — together.',
    copy: 'Build a moment that feels personal. Share a link. Watch it disappear when its time is up.',
  },
  {
    title: 'Keep the memory, not the feed.',
    copy: 'After the surprise ends, only you keep it as a private memory — quiet and lasting.',
  },
];

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { signInWithProvider } = useAuth();
  const [index, setIndex] = useState(0);
  const slide = slides[index];

  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.push('/create-account')} style={styles.skip}>
          <Text style={styles.skipText}>Skip </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.muted} />
        </Pressable>

        <View style={styles.brandWrap}>
          <Brand size="lg" />
        </View>

        <Text style={styles.title}>
          {slide.title.split('. ').map((part, i, arr) => (
            <Text key={part}>
              {i === arr.length - 1 && arr.length > 1 ? (
                <Text style={{ color: colors.pink }}>{part}</Text>
              ) : (
                part
              )}
              {i < arr.length - 1 ? '. ' : ' '}
            </Text>
          ))}
          <Text>❤️</Text>
        </Text>
        <Text style={styles.copy}>{slide.copy}</Text>

        <View style={styles.hero}>
          {hasBrandAsset('welcomeHero') ? (
            <Image source={brandAsset('welcomeHero')} style={styles.heroImage} resizeMode="contain" />
          ) : (
            <LinearGradient colors={[...gradients.soft]} style={styles.heroFallback}>
              <Text style={styles.heroGift}>🎁</Text>
              <View style={styles.floatRow}>
                <Text style={styles.float}>📷</Text>
                <Text style={styles.float}>🎵</Text>
                <Text style={styles.float}>🎤</Text>
                <Text style={styles.float}>▶️</Text>
              </View>
              <Text style={styles.heroHint}>Add welcome-hero.png in assets/brand</Text>
            </LinearGradient>
          )}
        </View>

        <View style={styles.dots}>
          {slides.map((_, i) => (
            <Pressable key={i} onPress={() => setIndex(i)} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <GradientButton icon="mail-outline" onPress={() => router.push('/create-account')}>
          Continue with Email
        </GradientButton>

        <OutlineButton
          icon={<GoogleGlyph />}
          onPress={() => signInWithProvider('google')}
        >
          Continue with Google
        </OutlineButton>
        <OutlineButton
          icon={<Ionicons name="logo-apple" size={20} color={colors.ink} />}
          onPress={() => signInWithProvider('apple')}
        >
          Continue with Apple
        </OutlineButton>
        <OutlineButton
          icon={<Ionicons name="call-outline" size={20} color={colors.ink} />}
          onPress={() => signInWithProvider('phone')}
        >
          Continue with Phone
        </OutlineButton>

        <Text onPress={() => router.push('/login')} style={styles.footer}>
          Already have an account? <Text style={styles.login}>Log In</Text>
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: 24, paddingBottom: 28 },
  skip: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  skipText: { color: colors.muted, fontWeight: '600' },
  brandWrap: { alignItems: 'center', marginTop: 4 },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 36,
    marginTop: 20,
  },
  copy: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  hero: { marginTop: 18, height: 220, alignItems: 'center', justifyContent: 'center' },
  heroImage: { width: '100%', height: '100%' },
  heroFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGift: { fontSize: 72 },
  floatRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
  float: { fontSize: 28 },
  heroHint: { color: colors.muted, fontSize: 11, marginTop: 10 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E8D6E0' },
  dotActive: { backgroundColor: colors.pink, width: 18 },
  footer: { textAlign: 'center', color: colors.muted, marginTop: 22, marginBottom: 8 },
  login: { color: colors.pink, fontWeight: '800' },
});
