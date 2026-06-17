// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (Phase 6) ───────
import * as Sentry from '@sentry/react-native';
import { PostHog } from 'posthog-react-native';

/**
 * Crash reporting (Sentry) + product analytics (PostHog), both free-tier and
 * both env-gated: with no key set they no-op, so dev and Expo Go stay quiet.
 * The plan wants every screen/reject/match/message logged from day one — the
 * funnel hooks call track() below.
 */
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enabled: !__DEV__, // don't ship dev noise to Sentry
  });
}

const posthog = posthogKey ? new PostHog(posthogKey, { host: posthogHost }) : null;

/** Wrap the root component for Sentry error boundaries (no-op without a DSN). */
export const wrapWithSentry = Sentry.wrap;

/** Fire-and-forget product event. Props must be JSON-serializable scalars. */
type EventProps = Record<string, string | number | boolean | null>;
export function track(event: string, props?: EventProps): void {
  posthog?.capture(event, props);
}

/** Tie analytics + crash reports to the signed-in user. */
export function identifyUser(userId: string): void {
  posthog?.identify(userId);
  Sentry.setUser({ id: userId });
}

/** Clear identity on sign-out. */
export function resetAnalytics(): void {
  posthog?.reset();
  Sentry.setUser(null);
}

export function captureError(error: unknown): void {
  Sentry.captureException(error);
}
