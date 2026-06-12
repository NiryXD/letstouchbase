import { useClerk, useUser } from '@clerk/clerk-expo';
import { glossary } from '@ltb/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LTB } from '@/constants/theme';

export default function YourResumeScreen() {
  const { signOut } = useClerk();
  const { user } = useUser();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>{glossary.brand.name}</Text>
        <Text style={styles.tagline}>{glossary.brand.tagline}</Text>
        {user?.primaryEmailAddress ? (
          <Text style={styles.email}>{user.primaryEmailAddress.emailAddress}</Text>
        ) : null}
      </View>
      <Text style={styles.hint}>
        Onboarding ("{glossary.onboarding.title}") lands here next: photo slots, executive
        summary, experience, education, behavioral questions.
      </Text>
      <Pressable style={styles.signOut} onPress={() => signOut()}>
        <Text style={styles.signOutText}>{glossary.auth.signOut}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  card: { backgroundColor: LTB.paper, borderRadius: 8, padding: 20 },
  name: { color: LTB.primary, fontWeight: '800', fontSize: 22 },
  tagline: { color: LTB.inkSecondary, marginTop: 4, fontStyle: 'italic' },
  hint: { color: LTB.inkSecondary, lineHeight: 20 },
  email: { color: LTB.inkSecondary, marginTop: 8, fontSize: 13 },
  signOut: {
    marginTop: 'auto',
    borderWidth: 1,
    borderColor: LTB.divider,
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    backgroundColor: LTB.paper,
  },
  signOutText: { color: LTB.reject, fontWeight: '600' },
});
