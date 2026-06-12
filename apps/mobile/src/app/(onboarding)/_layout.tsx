import { useAuth } from '@clerk/clerk-expo';
import { glossary } from '@ltb/shared';
import { Redirect, Stack } from 'expo-router';

import { LTB } from '@/constants/theme';
import { useMyProfile } from '@/lib/profile';

export default function OnboardingLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { data: profile, isLoading } = useMyProfile();

  if (!isLoaded || isLoading) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  if (profile) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerTitle: glossary.onboarding.title,
        headerStyle: { backgroundColor: LTB.paper },
        headerTintColor: LTB.navy,
        headerTitleStyle: { color: LTB.navy, fontWeight: '700' },
        contentStyle: { backgroundColor: LTB.feedGray },
      }}
    />
  );
}
