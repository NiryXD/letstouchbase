import { useAuth } from '@clerk/clerk-expo';
import { glossary } from '@ltb/shared';
import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';

import { LTB } from '@/constants/theme';
import { useMyProfile } from '@/lib/profile';

function TabIcon({ glyph }: { glyph: string }) {
  return <Text style={{ fontSize: 18 }}>{glyph}</Text>;
}

export default function TabsLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { data: profile, isLoading } = useMyProfile();
  if (!isLoaded || (isSignedIn && isLoading)) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  if (!profile) return <Redirect href="/(onboarding)" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: LTB.paper },
        headerTitleStyle: { color: LTB.navy, fontWeight: '700' },
        headerShadowVisible: true,
        tabBarActiveTintColor: LTB.primary,
        tabBarInactiveTintColor: LTB.inkSecondary,
        tabBarStyle: { backgroundColor: LTB.paper },
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
        }}
      />
      <Tabs.Screen
        name="pipeline"
        options={{
          title: glossary.tabs.pipeline,
          headerTitle: glossary.pipeline.title,
          tabBarIcon: () => <TabIcon glyph="📊" />,
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
  );
}
