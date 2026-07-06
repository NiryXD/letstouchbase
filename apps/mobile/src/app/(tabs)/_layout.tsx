import { useAuth } from '@clerk/clerk-expo';
import { glossary } from '@ltb/shared';
import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';

import { NotificationPrimer } from '@/components/notification-primer';
import { LTB } from '@/constants/theme';
import { useInbound } from '@/lib/discovery';
import { useActionRequired, useMatches } from '@/lib/matches';
import { useMyProfile } from '@/lib/profile';

function TabIcon({ glyph }: { glyph: string }) {
  return <Text style={{ fontSize: 18 }}>{glyph}</Text>;
}

/** Clamp a count into a tab badge value: undefined hides the dot; 99+ caps it. */
function badge(count: number | undefined): number | string | undefined {
  if (!count) return undefined;
  return count > 99 ? '99+' : count;
}

export default function TabsLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { data: profile, isLoading } = useMyProfile();

  // Pipeline / Inbound counts drive tab badges so the retention signals are
  // visible without opening each tab. All cached and reused by the screens.
  const { data: inbound } = useInbound();
  const { data: matches } = useMatches();
  const { data: actionable } = useActionRequired((matches ?? []).map((m) => m.matchId));

  if (!isLoaded || (isSignedIn && isLoading)) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  if (!profile) return <Redirect href="/(onboarding)" />;

  return (
    <>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: LTB.paper },
          headerTitleStyle: { color: LTB.navy, fontWeight: '700' },
          headerShadowVisible: true,
          tabBarActiveTintColor: LTB.primary,
          tabBarInactiveTintColor: LTB.inkSecondary,
          tabBarStyle: { backgroundColor: LTB.paper },
          tabBarBadgeStyle: { backgroundColor: LTB.primary },
          sceneStyle: { backgroundColor: LTB.feedGray },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: glossary.tabs.candidates,
            tabBarIcon: () => <TabIcon glyph="🗂️" />,
          }}
        />
        <Tabs.Screen
          name="inbound"
          options={{
            title: glossary.tabs.inbound,
            headerTitle: glossary.inbound.title,
            tabBarIcon: () => <TabIcon glyph="📥" />,
            tabBarBadge: badge(inbound?.length),
          }}
        />
        <Tabs.Screen
          name="pipeline"
          options={{
            title: glossary.tabs.pipeline,
            headerTitle: glossary.pipeline.title,
            tabBarIcon: () => <TabIcon glyph="📊" />,
            tabBarBadge: badge(actionable?.size),
          }}
        />
        <Tabs.Screen
          name="you"
          options={{
            title: glossary.tabs.you,
            tabBarIcon: () => <TabIcon glyph="📄" />,
          }}
        />
      </Tabs>
      <NotificationPrimer />
    </>
  );
}
