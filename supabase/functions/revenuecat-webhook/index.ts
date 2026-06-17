// revenuecat-webhook — entitlements upsert (docs/plan/08-backend-contracts.md §7).
// Auth is RevenueCat's configurable Authorization header, not a JWT:
//   supabase functions deploy revenuecat-webhook --no-verify-jwt
//   supabase secrets set RC_WEBHOOK_SECRET=<value configured in the RC dashboard>
// In RevenueCat: Project settings → Integrations → Webhooks → set the
// Authorization header to "Bearer <RC_WEBHOOK_SECRET>". App user ID must be
// the Clerk user id (Purchases.configure with appUserID = clerk user id).
import { createClient } from "npm:@supabase/supabase-js@2";
// [Opus 4.8] pure product decoding lives in _shared so it can be unit-tested
import { creditsFor } from "../_shared/rc-products.ts";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Subscription entitlement identifier in RevenueCat for The Executive Suite.
const EXECUTIVE_ENTITLEMENT = "executive";

// Events that mean the subscription entitlement is (still) active.
const ACTIVATING = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
]);

Deno.serve(async (req) => {
  const headers = { "Content-Type": "application/json" };
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  }

  const secret = Deno.env.get("RC_WEBHOOK_SECRET");
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || (auth !== secret && auth !== `Bearer ${secret}`)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers });
  }

  let event: Record<string, unknown>;
  try {
    event = (await req.json())?.event ?? {};
  } catch {
    return new Response(JSON.stringify({ error: "bad_json" }), { status: 400, headers });
  }

  const type = String(event.type ?? "");
  const userId = String(event.app_user_id ?? "");
  const productId = String(event.product_id ?? "");
  const entitlements = Array.isArray(event.entitlement_ids)
    ? event.entitlement_ids.map(String)
    : [];

  // RevenueCat retries on non-2xx; only signal retry for our own failures.
  // Anonymous ids ($RCAnonymousID:…) can't map to a profile — acknowledge.
  if (!userId || userId.startsWith("$RCAnonymousID")) {
    return new Response(JSON.stringify({ ok: true, skipped: "no_app_user_id" }), { status: 200, headers });
  }

  let rpc: { error: { message: string } | null } | null = null;

  if (type === "NON_RENEWING_PURCHASE") {
    const { headhunt, boost } = creditsFor(productId);
    if (headhunt === 0 && boost === 0) {
      console.warn("revenuecat-webhook: unknown consumable", productId);
    } else {
      rpc = await db.rpc("ltb_grant_credits", {
        p_user: userId,
        p_headhunt: headhunt,
        p_boost: boost,
      });
    }
  } else if (ACTIVATING.has(type) && entitlements.includes(EXECUTIVE_ENTITLEMENT)) {
    rpc = await db.rpc("ltb_apply_executive", { p_user: userId, p_active: true });
  } else if (type === "EXPIRATION" && entitlements.includes(EXECUTIVE_ENTITLEMENT)) {
    rpc = await db.rpc("ltb_apply_executive", { p_user: userId, p_active: false });
  }
  // CANCELLATION keeps access until expiry; TRANSFER/BILLING_ISSUE/etc. are
  // acknowledged without action in v1.

  if (rpc?.error) {
    console.error("revenuecat-webhook rpc failed", type, rpc.error.message);
    return new Response(JSON.stringify({ error: "internal" }), { status: 500, headers });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
});
