// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (test layer) ─────
// Pure RevenueCat consumable-product decoding, extracted from
// revenuecat-webhook for unit testing. See rc-products.test.ts.

/**
 * Consumable product ids encode kind and quantity:
 *   ltb_headhunt_1, ltb_headhunt_5, ltb_boost_1 (Expedited Review), …
 * Unknown products grant nothing so a typo'd product can't mint credits.
 */
export function creditsFor(productId: string): { headhunt: number; boost: number } {
  const m = productId.match(/_(\d+)$/);
  const qty = m ? parseInt(m[1], 10) : 1;
  if (productId.includes('headhunt')) return { headhunt: qty, boost: 0 };
  if (productId.includes('boost') || productId.includes('expedited')) {
    return { headhunt: 0, boost: qty };
  }
  return { headhunt: 0, boost: 0 };
}
