/*
 * [Opus 4.8] Support page — store listings expect a reachable support URL.
 * Mirrors the /privacy and /terms layout (.legal). Fill the [BRACKETED]
 * placeholders (support email) before Play submission.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { glossary } from "@ltb/shared";

export const metadata: Metadata = {
  title: `Support — ${glossary.brand.name}`,
};

export default function SupportPage() {
  return (
    <main className="legal">
      <p>
        <Link href="/">← Back to {glossary.brand.name}</Link>
      </p>
      <h1>Support / Human Resources</h1>
      <p className="legal-meta">We aim to respond within 2 business days.</p>

      <h2>Contact</h2>
      <p>
        Questions, bug reports, safety concerns, or feedback:{" "}
        <strong>[SUPPORT_EMAIL — set before launch]</strong>. Please include the
        email on your account and your device/OS so we can help faster.
      </p>

      <h2>Common requests</h2>
      <ul>
        <li>
          <strong>Delete my account.</strong> In the app: open{" "}
          <em>{glossary.tabs.you}</em> → <em>Tender Your Resignation</em>. This
          permanently removes your resume, photos, matches, and messages. You can
          also email us to request deletion.
        </li>
        <li>
          <strong>Manage or cancel a subscription.</strong> The{" "}
          {glossary.premium.tierName} subscription and any consumables are billed
          by Google Play — manage or cancel them in the Play Store under
          Subscriptions. Paid tiers only raise volume limits; every feature stays
          free.
        </li>
        <li>
          <strong>Report a user or content.</strong> In any Alignment Call, tap{" "}
          <em>Report &amp; Block</em>. We review every report and may remove
          content or accounts.
        </li>
        <li>
          <strong>Notifications.</strong> Tune categories and quiet hours in{" "}
          <em>{glossary.tabs.you}</em> → <em>{glossary.notifications.title}</em>.
        </li>
      </ul>

      <h2>Safety</h2>
      <p>
        We do not conduct background checks. Meet in public, tell a colleague
        where you&rsquo;ll be, and trust your judgment. If you feel unsafe,
        contact local authorities first, then report the user to us.
      </p>

      <h2>Policies</h2>
      <p>
        <Link href="/privacy">Privacy Policy</Link> ·{" "}
        <Link href="/terms">Terms of Service</Link>
      </p>
    </main>
  );
}
