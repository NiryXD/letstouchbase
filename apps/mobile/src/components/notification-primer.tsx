import { useAuth } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { glossary } from '@ltb/shared';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { LTB } from '@/constants/theme';
import { requestAndRegister } from '@/lib/notifications';

/**
 * Contextual notification pre-prompt (store-readiness, LAUNCH.md §9). Shown once
 * per install, only when the OS permission is still undetermined, so the system
 * dialog never fires cold. "Keep me posted" triggers the real request; "Not
 * right now" defers without burning the one-shot OS prompt. Either way we record
 * that we've asked, so we never nag on subsequent launches.
 */
const SEEN_KEY = 'ltb.pushPrimerSeen.v1';

export function NotificationPrimer() {
  const { userId, isSignedIn } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isSignedIn || !userId || !Device.isDevice) return;
      if (await AsyncStorage.getItem(SEEN_KEY)) return;
      const { status, canAskAgain } = await Notifications.getPermissionsAsync();
      if (!cancelled && status === 'undetermined' && canAskAgain) setVisible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, userId]);

  const markSeen = () => AsyncStorage.setItem(SEEN_KEY, '1').catch(() => {});

  const onEnable = async () => {
    markSeen();
    setVisible(false);
    if (userId) await requestAndRegister(userId).catch(() => {});
  };

  const onDismiss = () => {
    markSeen();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <Text style={styles.memoLabel}>Internal Memo · Re: Reachability</Text>
          <Text style={styles.title}>{glossary.notifications.primerTitle}</Text>
          <Text style={styles.body}>{glossary.notifications.primerBody}</Text>
          <Pressable style={styles.enable} onPress={onEnable}>
            <Text style={styles.enableText}>{glossary.notifications.primerEnable}</Text>
          </Pressable>
          <Pressable style={styles.dismiss} onPress={onDismiss} hitSlop={8}>
            <Text style={styles.dismissText}>{glossary.notifications.primerDismiss}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(27, 58, 92, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: LTB.paper,
    borderRadius: 12,
    padding: 24,
    gap: 10,
    borderTopWidth: 4,
    borderTopColor: LTB.primary,
  },
  memoLabel: {
    color: LTB.inkSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: { color: LTB.navy, fontSize: 20, fontWeight: '800' },
  body: { color: LTB.ink, fontSize: 14, lineHeight: 20 },
  enable: {
    marginTop: 8,
    backgroundColor: LTB.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  enableText: { color: LTB.paper, fontWeight: '700', fontSize: 15 },
  dismiss: { paddingVertical: 10, alignItems: 'center' },
  dismissText: { color: LTB.inkSecondary, fontWeight: '600' },
});
