// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (test layer) ─────
// Pure notification-preference logic, extracted from push-dispatch so it can be
// unit-tested without a running Deno.serve or DB. See notify.test.ts.

export type NotifyPrefs = {
  push_enabled: boolean;
  screens: boolean;
  matches: boolean;
  messages: boolean;
  rejections: boolean;
  quiet_start: number | null;
  quiet_end: number | null;
  tz: string | null;
};

/** Push kind → the notification_prefs column that governs it. */
export const KIND_TO_PREF: Record<string, keyof NotifyPrefs> = {
  screen: 'screens',
  match: 'matches',
  message: 'messages',
  rejection: 'rejections',
};

/** Is `now` inside the user's quiet-hours window (which may wrap midnight)? */
export function isQuiet(
  now: Date,
  start: number | null,
  end: number | null,
  tz: string | null,
): boolean {
  if (start == null || end == null || !tz || start === end) return false;
  let h: number;
  try {
    h =
      Number(
        new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(now),
      ) % 24;
  } catch {
    return false; // bad tz → never suppress (fail open)
  }
  return start < end ? h >= start && h < end : h >= start || h < end;
}

/**
 * Should this recipient receive a push of `kind` right now? A missing prefs row
 * means defaults (send). Master switch off, a muted category, or being inside
 * quiet hours all suppress it.
 */
export function shouldNotify(
  prefs: NotifyPrefs | null | undefined,
  kind: string,
  now: Date,
): boolean {
  if (!prefs) return true;
  if (!prefs.push_enabled) return false;
  const col = KIND_TO_PREF[kind];
  if (col && prefs[col] === false) return false;
  if (isQuiet(now, prefs.quiet_start, prefs.quiet_end, prefs.tz)) return false;
  return true;
}
