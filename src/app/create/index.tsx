import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Brand,
  Chip,
  colors,
} from '@/components/wishdrop-ui';

import {
  OCCASION_FILTERS,
  OccasionCategory,
  OCCASIONS,
} from '@/constants/occasions';

import { useCreateDraft } from '@/providers/create-draft-provider';

export default function ChooseOccasion() {
  const insets = useSafeAreaInsets();

  const { reset, setDraft } = useCreateDraft();

  const [filter, setFilter] =
    useState<OccasionCategory>('all');

  const list = useMemo(
    () =>
      filter === 'all'
        ? OCCASIONS
        : OCCASIONS.filter(
            item => item.category === filter
          ),
    [filter],
  );

  const pick = (label: string) => {
    reset();

    setDraft({
      occasion: label,
      title: `${label} surprise`,
    });

    router.push({
      pathname: '/create/for',
      params: {
        occasion: label,
      },
    });
  };

  return (
    <View
      style={[
        styles.safe,
        {
          paddingTop: Math.max(insets.top, 12),
        },
      ]}
    >
      {/* Header */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backButton}
        >
          <Ionicons
            name="chevron-back"
            size={26}
            color={colors.ink}
          />
        </Pressable>

        <Brand size="sm" />

        {/* Keeps Brand centered */}
        <View style={styles.headerSpacer} />
      </View>

      {/* Page heading */}
      <View style={styles.heading}>
        <Text style={styles.title}>
          Choose an occasion
        </Text>

        <Text style={styles.copy}>
          Pick the feeling — then make it personal.
        </Text>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={styles.filterScroll}
      >
        {OCCASION_FILTERS.map(item => (
          <Chip
            key={item.id}
            label={item.label}
            selected={filter === item.id}
            onPress={() => setFilter(item.id)}
          />
        ))}
      </ScrollView>

      {/* Occasion list */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        {list.map(item => (
          <Pressable
            key={item.id}
            onPress={() => pick(item.label)}
            style={styles.card}
          >
            <View style={styles.art}>
              <Text style={styles.emoji}>
                {item.emoji}
              </Text>
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>
                {item.label}
              </Text>

              <Text style={styles.cardMeta}>
                Tap to start creating
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.muted}
            />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.paper,
  },

  topBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },

  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerSpacer: {
    width: 32,
    height: 32,
  },

  heading: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },

  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    color: colors.ink,
  },

  copy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
  },

  filterScroll: {
    flexGrow: 0,
  },

  filters: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },

  list: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: colors.white,

    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,

    padding: 14,
    marginBottom: 12,

    gap: 14,

    minHeight: 92,
  },

  art: {
    width: 64,
    height: 64,
    borderRadius: 16,

    backgroundColor: colors.soft,

    alignItems: 'center',
    justifyContent: 'center',
  },

  emoji: {
    fontSize: 32,
  },

  cardContent: {
    flex: 1,
  },

  cardTitle: {
    color: colors.ink,
    fontWeight: '800',
    fontSize: 17,
  },

  cardMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
});