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
 * Fetch the Expo push token and upsert it into `devices`. Assumes permission
 * is already granted; returns the token, or null when push isn't available
 * (no device, no EAS project, or the network write failed).
 */
async function storePushToken(userId: string): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#0A66C2',
    });
  }

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
 * Register the device *only if permission is already granted* — never triggers
 * the OS permission dialog. Called on every app open so a returning user who
 * opted in keeps a fresh token, without a cold, contextless prompt. The
 * contextual ask lives in `<NotificationPrimer>` (store-readiness: a clear
 * pre-prompt rationale before the system dialog).
 */
export async function registerIfGranted(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null; // no push on simulators/emulators
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return null;
  return storePushToken(userId);
}

/**
 * Trigger the OS permission dialog, then register on grant. Call this from a
 * user gesture *after* showing the rationale (the primer's "Keep me posted").
 * Returns the token, or null if the user declined or push is unavailable.
 */
export async function requestAndRegister(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null;
  const existing = await Notifications.getPermissionsAsync();
  const status =
    existing.status === 'granted'
      ? existing.status
      : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;
  return storePushToken(userId);
}

/**
 * Mounted once in the root layout: registers the device when signed in (only
 * if permission was already granted) and wires tap handling (both warm taps
 * and cold-start launches).
 */
export function usePushNotifications() {
  const { userId, isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn && userId) {
      registerIfGranted(userId).catch(() => {});
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
