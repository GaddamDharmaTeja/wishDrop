import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/people-ui';
import { colors } from '@/components/wishdrop-ui';
import { api } from '@/lib/api';
import { SurpriseAnalytics } from '@/lib/types';

export default function CreatorAnalytics() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const [data, setData] = useState<SurpriseAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!params.id) return;
      setError(null);
      api
        .analytics(params.id)
        .then(setData)
        .catch(err => setError(err instanceof Error ? err.message : 'Could not load analytics.'));
    }, [params.id]),
  );

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + 32 }]}>
        <ScreenHeader title="Creator view" onBack={() => router.back()} />
        <Text style={styles.copy}>Live activity for {params.name || 'this surprise'}.</Text>
        {!data && !error ? <ActivityIndicator color={colors.pink} style={{ marginTop: 40 }} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {data ? (
          <>
            <View style={styles.grid}>
              {[
                { label: 'Wishes', value: data.stats.wishes, icon: 'chatbubble-ellipses-outline' as const },
                { label: 'Photos', value: data.stats.photos, icon: 'image-outline' as const },
                { label: 'Videos', value: data.stats.videos, icon: 'videocam-outline' as const },
                { label: 'Voice', value: data.stats.voice, icon: 'mic-outline' as const },
              ].map(item => (
                <View key={item.label} style={styles.stat}>
                  <Ionicons name={item.icon} size={20} color={colors.pink} />
                  <Text style={styles.statValue}>{item.value}</Text>
                  <Text style={styles.statLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.section}>Activity</Text>
            {data.activity.length ? (
              data.activity.map(item => (
                <View key={item.id} style={styles.row}>
                  <View style={styles.timelineDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                    <Text style={styles.rowMeta}>
                      {new Date(item.at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.empty}>No activity yet. Share the invite link to get started.</Text>
            )}
            <Pressable
              style={styles.backLink}
              onPress={() => router.push({ pathname: '/create/invite', params: { id: params.id, name: params.name } })}
            >
              <Text style={styles.backText}>Back to invites</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: 20 },
  copy: { color: colors.muted, marginBottom: 18 },
  error: { color: '#D93636', marginTop: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 6,
  },
  statValue: { color: colors.ink, fontSize: 28, fontWeight: '900' },
  statLabel: { color: colors.muted, fontWeight: '700' },
  section: { color: colors.ink, fontWeight: '900', fontSize: 20, marginTop: 28, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 8,
    alignItems: 'center',
  },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.pink },
  rowLabel: { color: colors.ink, fontWeight: '700' },
  rowMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  empty: { color: colors.muted, lineHeight: 20 },
  backLink: { alignItems: 'center', paddingVertical: 18 },
  backText: { color: colors.pink, fontWeight: '800' },
});
