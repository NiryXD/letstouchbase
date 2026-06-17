import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { usePushNotifications } from '@/lib/notifications'; // [Opus 4.8] Phase 6
import { identifyUser, resetAnalytics, wrapWithSentry } from '@/lib/observability'; // [Opus 4.8] Phase 6
import { configurePurchases } from '@/lib/purchases'; // [Opus 4.8] Phase 5
import { setClerkTokenGetter } from '@/lib/supabase';

const queryClient = new QueryClient();

/** Bridges the Clerk session into the Supabase client (runbook section 2.3). */
function SupabaseTokenBridge() {
  const { getToken } = useAuth();
  useEffect(() => {
    setClerkTokenGetter(() => getToken());
  }, [getToken]);
  return null;
}

// [Opus 4.8] Configure RevenueCat with the Clerk user id so webhook events map
// to the right profile. No-ops safely without a native module or API key.
function RevenueCatBridge() {
  const { userId } = useAuth();
  useEffect(() => {
    if (userId) configurePurchases(userId);
  }, [userId]);
  return null;
}

// [Opus 4.8] Phase 6: register for push + tie analytics/crash reports to the user.
function ObservabilityBridge() {
  const { userId, isSignedIn } = useAuth();
  usePushNotifications();
  useEffect(() => {
    if (isSignedIn && userId) identifyUser(userId);
    else resetAnalytics();
  }, [isSignedIn, userId]);
  return null;
}

function RootLayout() {
  return (
    <ClerkProvider tokenCache={tokenCache}>
      <QueryClientProvider client={queryClient}>
        <SupabaseTokenBridge />
        <RevenueCatBridge />
        <ObservabilityBridge />
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

// [Opus 4.8] wrap for Sentry error boundary (no-op without a DSN)
export default wrapWithSentry(RootLayout);
