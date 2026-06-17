// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (Phase 6) ───────
import { useAuth } from '@clerk/clerk-expo';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { supabase } from './supabase';

/**
 * Push notifications — the retention engine. Token registration upserts the
 * `devices` table the push-dispatch Edge Function fans out to; per-category
 * opt-outs and quiet hours are enforced server-side from notification_prefs.
 *
 * Everything is guarded: simulators, Expo Go, and missing EAS projectId all
 * degrade to "no push" rather than throwing.
 */

// Foreground presentation. Registered at module load so it's set before any
// notification arrives.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** Route a notification tap to the relevant tab, based on its `data.kind`. */
function routeFromData(data: unknown): void {
  const kind = (data as { kind?: string } | null)?.kind;
  switch (kind) {
    case 'screen':
      router.push('/inbound');
      break;
    case 'match':
    case 'message':
    case 'rejection':
      router.push('/pipeline');
      break;
    default:
      break;
  }
}

/**
 * Request permission, fetch the Expo push token, and upsert it into `devices`.
 * Returns the token, or null when push isn't available.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null; // no push on simulators/emulators

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#0A66C2',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;

  const id = projectId();
  if (!id) return null; // no EAS project yet — can't mint a token

  let token: string;
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
  } catch {
    return null;
  }

  const { error } = await supabase
    .from('devices')
    .upsert(
      { user_id: userId, push_token: token, platform: Platform.OS, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,push_token' },
    );
  if (error) return null;
  return token;
}

/**
 * Mounted once in the root layout: registers the device when signed in and
 * wires tap handling (both warm taps and cold-start launches).
 */
export function usePushNotifications() {
  const { userId, isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn && userId) {
      registerForPushNotifications(userId).catch(() => {});
    }
  }, [isSignedIn, userId]);

  useEffect(() => {
    // app opened from a tapped notification while backgrounded/foregrounded
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      routeFromData(response.notification.request.content.data);
    });
    // app launched cold from a notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) routeFromData(response.notification.request.content.data);
    });
    return () => sub.remove();
  }, []);
}
