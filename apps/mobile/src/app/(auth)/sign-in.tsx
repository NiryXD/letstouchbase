import { useSignIn } from '@clerk/clerk-expo';
import { glossary } from '@ltb/shared';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { LTB } from '@/constants/theme';

function clerkErrorMessage(err: unknown): string {
  const e = err as { errors?: { message?: string }[] };
  return e?.errors?.[0]?.message ?? 'Something went wrong. Please escalate to your manager (try again).';
}

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSignIn = async () => {
    if (!isLoaded || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await signIn.create({ identifier: email.trim(), password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
      } else {
        setError('Additional verification required — check your email.');
      }
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.brand}>{glossary.brand.name}</Text>
        <Text style={styles.title}>{glossary.auth.signInTitle}</Text>
        <Text style={styles.sub}>{glossary.auth.signInSub}</Text>

        <Text style={styles.label}>{glossary.auth.emailLabel}</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>{glossary.auth.passwordLabel}</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          autoComplete="current-password"
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={[styles.button, busy && styles.buttonDisabled]} onPress={onSignIn}>
          {busy ? (
            <ActivityIndicator color={LTB.paper} />
          ) : (
            <Text style={styles.buttonText}>{glossary.auth.signInCta}</Text>
          )}
        </Pressable>

        <Link href="/(auth)/sign-up" style={styles.switchLink}>
          {glossary.auth.toSignUp}
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: LTB.paper, borderRadius: 8, padding: 24, gap: 6 },
  brand: { color: LTB.primary, fontWeight: '800', fontSize: 18 },
  title: { color: LTB.navy, fontWeight: '700', fontSize: 26, marginTop: 8 },
  sub: { color: LTB.inkSecondary, marginBottom: 12 },
  label: { color: LTB.ink, fontWeight: '600', fontSize: 13, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: LTB.divider,
    borderRadius: 6,
    padding: 12,
    color: LTB.ink,
    backgroundColor: LTB.paper,
  },
  error: { color: LTB.reject, marginTop: 8 },
  button: {
    backgroundColor: LTB.primary,
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: LTB.paper, fontWeight: '700', fontSize: 16 },
  switchLink: { color: LTB.primary, marginTop: 16, textAlign: 'center' },
});
