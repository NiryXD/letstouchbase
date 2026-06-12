import { useAuth } from '@clerk/clerk-expo';
import { glossary, PHOTO_SLOTS } from '@ltb/shared';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { StepScreen } from '@/components/form';
import { useOnboarding } from '@/features/onboarding/store';
import { LTB } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

async function pickAndUpload(userId: string, slot: string): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: [4, 5],
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const res = await fetch(asset.uri);
  const body = await res.arrayBuffer();
  const path = `${userId}/${slot}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('photos').upload(path, body, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;
  return path;
}

export function photoUrl(path: string): string {
  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

export default function PhotosStep() {
  const { userId } = useAuth();
  const { photos, set } = useOnboarding();
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (slot: string) => {
    if (!userId || busySlot) return;
    setBusySlot(slot);
    setError(null);
    try {
      const path = await pickAndUpload(userId, slot);
      if (path) set({ photos: { ...photos, [slot]: path } });
    } catch {
      setError('Upload failed — check your connection and try again.');
    } finally {
      setBusySlot(null);
    }
  };

  const headshotDone = !!photos.headshot;

  return (
    <StepScreen
      title="Photos"
      subtitle={glossary.onboarding.dressCode}
      ctaLabel="Continue"
      ctaDisabled={!headshotDone}
      onNext={() => router.push('/(onboarding)/criteria')}>
      {PHOTO_SLOTS.map((slot) => {
        const path = photos[slot.key];
        return (
          <Pressable key={slot.key} style={styles.slot} onPress={() => onPick(slot.key)}>
            {path ? (
              <Image source={{ uri: photoUrl(path) }} style={styles.thumb} />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.plus}>+</Text>
              </View>
            )}
            <View style={styles.slotMeta}>
              <Text style={styles.slotLabel}>
                {slot.label}
                {slot.required ? ' (required)' : ''}
              </Text>
              <Text style={styles.slotHint}>
                {busySlot === slot.key ? 'Uploading…' : path ? 'Tap to replace' : 'Tap to add'}
              </Text>
            </View>
          </Pressable>
        );
      })}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LTB.paper,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  thumb: { width: 64, height: 80, borderRadius: 6, backgroundColor: LTB.divider },
  placeholder: {
    width: 64,
    height: 80,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: LTB.inkSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: { color: LTB.inkSecondary, fontSize: 24 },
  slotMeta: { flex: 1 },
  slotLabel: { color: LTB.ink, fontWeight: '600' },
  slotHint: { color: LTB.inkSecondary, fontSize: 12, marginTop: 2 },
  error: { color: LTB.reject, marginTop: 4 },
});
