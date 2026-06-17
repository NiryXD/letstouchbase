// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (Phase 5) ───────
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';

/**
 * Thin, defensive wrapper around RevenueCat (store IAP — never Stripe for
 * digital goods on mobile). The DB `entitlements` row, written by the
 * revenuecat-webhook, is the source of truth the UI gates on; this client is
 * only used to *start* purchases and restore them.
 *
 * The SDK needs a native module + a configured API key, neither of which
 * exists in Expo Go or in a build with no key set. Every call is guarded so
 * those environments degrade to "billing unavailable" instead of crashing.
 */

const apiKey =
  Platform.select({
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  }) ?? '';

let configured = false;

/** Configure once, keyed to the Clerk user id so the webhook can map events. */
export function configurePurchases(appUserId: string): void {
  if (configured || !apiKey) return;
  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey, appUserID: appUserId });
    configured = true;
  } catch {
    // Native module missing (e.g. Expo Go) — stays unconfigured, UI adapts.
    configured = false;
  }
}

/** Whether real purchases can be attempted in this build. */
export function isPurchasesAvailable(): boolean {
  return configured;
}

export async function getOfferings(): Promise<PurchasesOffering[]> {
  if (!configured) return [];
  const offerings = await Purchases.getOfferings();
  return Object.values(offerings.all);
}

/** The subscription offering (The Executive Suite). */
export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!configured) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

/**
 * Consumable packages (Headhunts, Expedited Reviews), matched by the product
 * id convention the webhook decodes (`ltb_headhunt_*`, `ltb_boost_*`).
 */
export async function getConsumablePackages(): Promise<{
  headhunts: PurchasesPackage[];
  boosts: PurchasesPackage[];
}> {
  const headhunts: PurchasesPackage[] = [];
  const boosts: PurchasesPackage[] = [];
  if (!configured) return { headhunts, boosts };
  const offerings = await Purchases.getOfferings();
  for (const offering of Object.values(offerings.all)) {
    for (const pkg of offering.availablePackages) {
      const id = pkg.product.identifier.toLowerCase();
      if (id.includes('headhunt')) headhunts.push(pkg);
      else if (id.includes('boost') || id.includes('expedited')) boosts.push(pkg);
    }
  }
  return { headhunts, boosts };
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}
