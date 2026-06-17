// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (Business Trip) ──
import { glossary } from '@ltb/shared';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Field } from '@/components/form';
import { LTB } from '@/constants/theme';
import { useEndBusinessTrip, useStartBusinessTrip } from '@/lib/location';
import { useMyProfile } from '@/lib/profile';

const B = glossary.businessTrip;

export default function BusinessTripScreen() {
  const { data: profile } = useMyProfile();
  const start = useStartBusinessTrip();
  const end = useEndBusinessTrip();
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const active = profile?.is_business_trip ?? false;

  const onStart = async () => {
    setError(null);
    try {
      await start.mutateAsync(address);
      setAddress('');
    } catch (e) {
      setError((e as { message?: string })?.message ?? B.notFound);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: B.title,
          headerStyle: { backgroundColor: LTB.paper },
          headerTintColor: LTB.navy,
          headerTitleStyle: { color: LTB.navy, fontWeight: '700' },
        }}
      />
      <Text style={styles.sub}>{B.sub}</Text>

      {active ? (
        <View style={styles.activeCard}>
          <Text style={styles.activeTitle}>✈ {B.active}</Text>
          <Text style={styles.activeBody}>{B.activeAt}</Text>
          <Pressable
            style={[styles.endBtn, end.isPending && styles.disabled]}
            disabled={end.isPending}
            onPress={() => end.mutate()}>
            {end.isPending ? (
              <ActivityIndicator color={LTB.primary} />
            ) : (
              <Text style={styles.endText}>{B.end}</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Field
            label={B.addressLabel}
            placeholder={B.addressPlaceholder}
            value={address}
            onChangeText={setAddress}
            autoCapitalize="words"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            style={[styles.startBtn, (!address.trim() || start.isPending) && styles.disabled]}
            disabled={!address.trim() || start.isPending}
            onPress={onStart}>
            {start.isPending ? (
              <ActivityIndicator color={LTB.paper} />
            ) : (
              <Text style={styles.startText}>{B.start}</Text>
            )}
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LTB.feedGray },
  content: { padding: 16, gap: 12 },
  sub: { color: LTB.inkSecondary, lineHeight: 19 },
  card: { backgroundColor: LTB.paper, borderRadius: 8, padding: 16 },
  activeCard: {
    backgroundColor: LTB.paper,
    borderRadius: 8,
    padding: 16,
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: LTB.gold,
  },
  activeTitle: { color: LTB.navy, fontWeight: '700', fontSize: 16 },
  activeBody: { color: LTB.inkSecondary, lineHeight: 19 },
  startBtn: { backgroundColor: LTB.primary, borderRadius: 6, padding: 14, alignItems: 'center', marginTop: 4 },
  startText: { color: LTB.paper, fontWeight: '700' },
  endBtn: {
    borderWidth: 1,
    borderColor: LTB.primary,
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  endText: { color: LTB.primary, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  error: { color: LTB.reject, marginTop: 4, marginBottom: 4 },
});
