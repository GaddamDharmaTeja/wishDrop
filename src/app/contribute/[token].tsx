import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientButton, OutlineButton } from '@/components/wishdrop-ui';
import { api } from '@/lib/api';

type Info = {
  recipientName: string;
  occasion: string;
  title: string;
};

export default function Contribute() {
  const { token } = useLocalSearchParams<{ token: string }>();

  const insets = useSafeAreaInsets();

  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid contribution link.');
      return;
    }

    setInfo(null);
    setError(null);

    api
      .contributeInfo(token)
      .then(setInfo)
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : 'This invite is no longer available.'
        );
      });
  }, [token]);

  const send = async () => {
    if (!name.trim() || !message.trim()) {
      Alert.alert(
        'Almost there',
        'Please add your name and a message.'
      );
      return;
    }

    if (!token) {
      Alert.alert('Invalid link', 'This contribution link is not valid.');
      return;
    }

    setBusy(true);

    try {
      await api.contribute(
        token,
        name.trim(),
        message.trim()
      );

      setSent(true);
    } catch (err) {
      Alert.alert(
        'Could not send',
        err instanceof Error ? err.message : 'Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  const leave = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const renderBody = () => {
    // Invalid / expired invite
    if (error) {
      return (
        <>
          <Text style={styles.big}>💌</Text>

          <Text style={styles.title}>
            This invite is closed
          </Text>

          <Text style={styles.copy}>
            {error}
          </Text>

          <OutlineButton onPress={leave}>
            Close
          </OutlineButton>
        </>
      );
    }

    // Loading
    if (!info) {
      return (
        <ActivityIndicator
          color="#FFFFFF"
          size="large"
        />
      );
    }

    const firstName =
      info.recipientName?.split(' ')[0] ||
      info.recipientName;

    // Successfully sent
    if (sent) {
      return (
        <>
          <Text style={styles.big}>🎉</Text>

          <Text style={styles.title}>
            Sent!
          </Text>

          <Text style={styles.copy}>
            Your wish will be part of {firstName}&apos;s surprise.
          </Text>

          <OutlineButton onPress={leave}>
            Close
          </OutlineButton>
        </>
      );
    }

    // Contribution form
    return (
      <>
        <Text style={styles.big}>💌</Text>

        <Text style={styles.eyebrow}>
          {info.occasion?.toUpperCase()}
        </Text>

        <Text style={styles.title}>
          Add your wish for {firstName}
        </Text>

        <Text style={styles.copy}>
          Your message will appear when {firstName} opens the surprise.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor="#9A8FA8"
          value={name}
          onChangeText={setName}
          maxLength={60}
          autoCapitalize="words"
          autoCorrect
        />

        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Write something from the heart..."
          placeholderTextColor="#9A8FA8"
          value={message}
          onChangeText={setMessage}
          maxLength={500}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.counter}>
          {message.length}/500
        </Text>

        <View style={styles.buttonContainer}>
          <GradientButton
            onPress={send}
            disabled={busy}
          >
            {busy ? 'Sending…' : 'Send my wish'}
          </GradientButton>
        </View>
      </>
    );
  };

  return (
    <LinearGradient
      colors={['#24164A', '#7526D9', '#F21C92']}
      style={styles.fill}
    >
      <ScrollView
        contentContainerStyle={[
          styles.page,
          {
            paddingTop: insets.top + 40,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderBody()}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },

  page: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  big: {
    fontSize: 64,
    marginBottom: 4,
  },

  eyebrow: {
    color: '#FFADD8',
    fontWeight: '800',
    marginTop: 14,
    letterSpacing: 1,
    fontSize: 13,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 10,
  },

  copy: {
    color: '#F5D6EA',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 18,
    lineHeight: 22,
    fontSize: 15,
  },

  input: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#17163F',
    marginTop: 12,
  },

  multiline: {
    minHeight: 130,
  },

  counter: {
    alignSelf: 'flex-end',
    color: '#F5D6EA',
    fontSize: 11,
    marginTop: 6,
  },

  buttonContainer: {
    alignSelf: 'stretch',
    marginTop: 8,
  },
});