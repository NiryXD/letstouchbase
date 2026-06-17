// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (test layer) ─────
// Run: deno test supabase/functions/_shared/
import { assertEquals } from 'jsr:@std/assert@1';

import { creditsFor } from './rc-products.ts';

Deno.test('creditsFor: headhunt packs decode quantity from the suffix', () => {
  assertEquals(creditsFor('ltb_headhunt_1'), { headhunt: 1, boost: 0 });
  assertEquals(creditsFor('ltb_headhunt_5'), { headhunt: 5, boost: 0 });
});

Deno.test('creditsFor: boost / expedited map to boost credits', () => {
  assertEquals(creditsFor('ltb_boost_1'), { headhunt: 0, boost: 1 });
  assertEquals(creditsFor('ltb_expedited_3'), { headhunt: 0, boost: 3 });
});

Deno.test('creditsFor: missing suffix defaults to quantity 1', () => {
  assertEquals(creditsFor('ltb_headhunt'), { headhunt: 1, boost: 0 });
});

Deno.test('creditsFor: unknown products grant nothing (no accidental minting)', () => {
  assertEquals(creditsFor('ltb_executive_monthly'), { headhunt: 0, boost: 0 });
  assertEquals(creditsFor('garbage'), { headhunt: 0, boost: 0 });
});
