// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (design pass) ────
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/**
 * Capture a view to a PNG and hand it to the OS share sheet. Powers the
 * screenshot-able Offer Letter / Rejection Letter cards — "beautiful enough to
 * post" is the marketing budget (docs/plan/01). Guarded: native module missing
 * (Expo Go) or sharing unavailable (web) → no-op, never throws into the UI.
 */
export async function shareViewAsImage(ref: RefObject<View | null>): Promise<boolean> {
  try {
    if (!ref.current || !(await Sharing.isAvailableAsync())) return false;
    const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share' });
    return true;
  } catch {
    return false;
  }
}
