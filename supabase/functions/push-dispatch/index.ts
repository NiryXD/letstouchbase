// push-dispatch — Expo push fan-out for Database Webhooks
// (docs/plan/08-backend-contracts.md, "Push notification dispatch").
// The funnel RPCs (ltb_request_screen / ltb_decide_screen) are pure SQL and
// can't call Expo, so screens/matches pushes unify here with chat, exactly
// as the Phase 3 note in doc 08 plans.
//
// Setup (Dashboard → Database → Webhooks), all POST to this function's URL
// with an added header  x-ltb-webhook-secret: <LTB_WEBHOOK_SECRET>:
//   messages           INSERT   "New message re: your Alignment Call"
//   screens            INSERT, UPDATE   "You have a new inbound application"
//   matches            INSERT   "Offer extended!" (both parties)
//   rejection_letters  INSERT   "A Formal Rejection Letter has arrived"
// Deploy:
//   supabase functions deploy push-dispatch --no-verify-jwt
//   supabase secrets set LTB_WEBHOOK_SECRET=<random>
import { createClient } from "npm:@supabase/supabase-js@2";
// [Opus 4.8] pure prefs logic lives in _shared so it can be unit-tested
import { shouldNotify, type NotifyPrefs } from "../_shared/notify.ts";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
};

type Push = { to: string; title: string; body: string; data?: Record<string, unknown> };

// [Opus 4.8] Phase 6 — recipient with the category used to honor prefs.
type Recipient = {
  userId: string;
  title: string;
  body: string;
  data: { kind: string } & Record<string, unknown>;
};

/**
 * Drop recipients who muted this category, disabled push entirely, or are in
 * their quiet-hours window. A missing prefs row = defaults (everything on).
 * The decision logic is pure + unit-tested in ../_shared/notify.test.ts.
 */
async function filterByPrefs(recipients: Recipient[]): Promise<Recipient[]> {
  const ids = [...new Set(recipients.map((r) => r.userId))];
  if (ids.length === 0) return recipients;
  const { data: rows, error } = await db
    .from("notification_prefs")
    .select("user_id, push_enabled, screens, matches, messages, rejections, quiet_start, quiet_end, tz")
    .in("user_id", ids);
  if (error) throw new Error(`notification_prefs: ${error.message}`);
  const byUser = new Map((rows ?? []).map((r) => [r.user_id, r as NotifyPrefs & { user_id: string }]));
  const now = new Date();
  return recipients.filter((r) => shouldNotify(byUser.get(r.userId), r.data.kind, now));
}

/** Resolve a set of user ids to one message per registered device. */
async function buildPushes(
  recipients: { userId: string; title: string; body: string; data?: Record<string, unknown> }[],
): Promise<Push[]> {
  const ids = [...new Set(recipients.map((r) => r.userId))];
  if (ids.length === 0) return [];
  const { data: devices, error } = await db
    .from("devices")
    .select("user_id, push_token")
    .in("user_id", ids);
  if (error) throw new Error(`devices: ${error.message}`);

  const pushes: Push[] = [];
  for (const r of recipients) {
    for (const d of devices ?? []) {
      if (d.user_id === r.userId) {
        pushes.push({ to: d.push_token, title: r.title, body: r.body, data: r.data });
      }
    }
  }
  return pushes;
}

/** Send via Expo in chunks of 100; prune tokens Expo says are dead. */
async function send(pushes: Push[]) {
  for (let i = 0; i < pushes.length; i += 100) {
    const chunk = pushes.slice(i, i + 100);
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      console.error("expo push failed", res.status, await res.text());
      continue;
    }
    const tickets = (await res.json())?.data ?? [];
    for (let j = 0; j < tickets.length; j++) {
      if (tickets[j]?.details?.error === "DeviceNotRegistered") {
        await db.from("devices").delete().eq("push_token", chunk[j].to);
      }
    }
  }
}

function preview(text: unknown): string {
  const s = String(text ?? "");
  return s.length > 120 ? `${s.slice(0, 119)}…` : s;
}

Deno.serve(async (req) => {
  const headers = { "Content-Type": "application/json" };
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  }
  const secret = Deno.env.get("LTB_WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-ltb-webhook-secret") !== secret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad_json" }), { status: 400, headers });
  }
  // screens needs INSERT + UPDATE: a 30-day-recycled screen is an upsert
  // that lands as UPDATE back to pending (doc 08 §2).
  const rec = payload.record;
  const screenRecycled = payload.table === "screens" &&
    payload.type === "UPDATE" &&
    rec?.status === "pending" &&
    payload.old_record?.status !== "pending";
  if (!rec || (payload.type !== "INSERT" && !screenRecycled)) {
    return new Response(JSON.stringify({ ok: true, skipped: "not_an_insert" }), { status: 200, headers });
  }

  try {
    const out: Recipient[] = [];

    switch (payload.table) {
      case "messages": {
        const { data: match } = await db
          .from("matches")
          .select("user_a, user_b, ended_at")
          .eq("id", String(rec.match_id))
          .maybeSingle();
        if (!match || match.ended_at) break;
        const recipient = match.user_a === rec.sender ? match.user_b : match.user_a;
        out.push({
          userId: recipient,
          title: "Alignment Call",
          body: preview(rec.body),
          data: { kind: "message", matchId: rec.match_id },
        });
        break;
      }
      case "screens": {
        if (rec.status !== "pending") break; // accept/reject UPDATEs handled elsewhere
        out.push({
          userId: String(rec.to_user),
          title: "New inbound application",
          body: "A candidate has submitted a cover letter for your review.",
          data: { kind: "screen" },
        });
        break;
      }
      case "matches": {
        for (const userId of [String(rec.user_a), String(rec.user_b)]) {
          out.push({
            userId,
            title: "Offer extended! 🎉",
            body: "Congratulations — you have a new match. Time to schedule an Alignment Call.",
            data: { kind: "match", matchId: rec.id },
          });
        }
        break;
      }
      case "rejection_letters": {
        out.push({
          userId: String(rec.to_user),
          title: "Correspondence received",
          body: "A Formal Rejection Letter has arrived. We wish you the best in your future endeavors.",
          data: { kind: "rejection" },
        });
        break;
      }
      default:
        return new Response(JSON.stringify({ ok: true, skipped: payload.table }), { status: 200, headers });
    }

    // [Opus 4.8] honor per-category opt-outs + quiet hours before sending
    const allowed = await filterByPrefs(out);
    await send(await buildPushes(allowed));
    return new Response(JSON.stringify({ ok: true, sent: allowed.length }), { status: 200, headers });
  } catch (err) {
    console.error("push-dispatch failed", payload.table, err);
    // 200 anyway: webhook retries can't fix a logic error and pushes are
    // best-effort; failures are visible in function logs.
    return new Response(JSON.stringify({ ok: false }), { status: 200, headers });
  }
});
