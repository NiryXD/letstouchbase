// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (test layer) ─────
// Run: deno test supabase/functions/_shared/
import { assertEquals } from 'jsr:@std/assert@1';

import { isQuiet, shouldNotify, type NotifyPrefs } from './notify.ts';

// Deterministic clock: 23:30 and 12:00 UTC, evaluated in the UTC zone.
const NIGHT = new Date('2026-06-16T23:30:00Z'); // hour 23
const NOON = new Date('2026-06-16T12:00:00Z'); // hour 12

Deno.test('isQuiet: disabled when bounds or tz are missing', () => {
  assertEquals(isQuiet(NIGHT, null, 7, 'UTC'), false);
  assertEquals(isQuiet(NIGHT, 22, null, 'UTC'), false);
  assertEquals(isQuiet(NIGHT, 22, 7, null), false);
  assertEquals(isQuiet(NIGHT, 8, 8, 'UTC'), false); // equal bounds = no window
});

Deno.test('isQuiet: window that wraps midnight', () => {
  // 22:00 → 07:00, "now" is 23:00 → inside
  assertEquals(isQuiet(NIGHT, 22, 7, 'UTC'), true);
  // same window, "now" is noon → outside
  assertEquals(isQuiet(NOON, 22, 7, 'UTC'), false);
});

Deno.test('isQuiet: same-day window (no wrap)', () => {
  assertEquals(isQuiet(NOON, 9, 17, 'UTC'), true); // 12 in [9,17)
  assertEquals(isQuiet(NIGHT, 9, 17, 'UTC'), false); // 23 outside
});

Deno.test('isQuiet: invalid timezone fails open (not quiet)', () => {
  assertEquals(isQuiet(NIGHT, 22, 7, 'Not/AZone'), false);
});

const ON: NotifyPrefs = {
  push_enabled: true,
  screens: true,
  matches: true,
  messages: true,
  rejections: true,
  quiet_start: null,
  quiet_end: null,
  tz: null,
};

Deno.test('shouldNotify: missing prefs row → send (defaults)', () => {
  assertEquals(shouldNotify(null, 'message', NOON), true);
  assertEquals(shouldNotify(undefined, 'screen', NOON), true);
});

Deno.test('shouldNotify: master switch off suppresses everything', () => {
  assertEquals(shouldNotify({ ...ON, push_enabled: false }, 'match', NOON), false);
});

Deno.test('shouldNotify: a muted category is suppressed, others still send', () => {
  const prefs = { ...ON, messages: false };
  assertEquals(shouldNotify(prefs, 'message', NOON), false);
  assertEquals(shouldNotify(prefs, 'match', NOON), true);
});

Deno.test('shouldNotify: quiet hours suppress regardless of category', () => {
  const prefs = { ...ON, quiet_start: 22, quiet_end: 7, tz: 'UTC' };
  assertEquals(shouldNotify(prefs, 'message', NIGHT), false); // inside quiet
  assertEquals(shouldNotify(prefs, 'message', NOON), true); // outside quiet
});

Deno.test('shouldNotify: unknown kind ignores category gate', () => {
  // a kind with no column mapping still respects master + quiet hours
  assertEquals(shouldNotify({ ...ON, screens: false }, 'unknown', NOON), true);
});
