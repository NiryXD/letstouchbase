import { useSignUp } from '@clerk/clerk-expo';
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

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSignUp = async () => {
    if (!isLoaded || busy) return;
    setBusy(true);
    setError(null);
    try {
      await signUp.create({ emailAddress: email.trim(), password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    if (!isLoaded || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
      } else {
        setError('Verification incomplete — double-check the code.');
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

        {pendingVerification ? (
          <>
            <Text style={styles.title}>{glossary.auth.verifyTitle}</Text>
            <Text style={styles.sub}>{glossary.auth.verifySub}</Text>

            <Text style={styles.label}>Code</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              value={code}
              onChangeText={setCode}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={[styles.button, busy && styles.buttonDisabled]} onPress={onVerify}>
              {busy ? (
                <ActivityIndicator color={LTB.paper} />
              ) : (
                <Text style={styles.buttonText}>{glossary.auth.verifyCta}</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>{glossary.auth.signUpTitle}</Text>
            <Text style={styles.sub}>{glossary.auth.signUpSub}</Text>

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
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={[styles.button, busy && styles.buttonDisabled]} onPress={onSignUp}>
              {busy ? (
                <ActivityIndicator color={LTB.paper} />
              ) : (
                <Text style={styles.buttonText}>{glossary.auth.signUpCta}</Text>
              )}
            </Pressable>

            <Link href="/(auth)/sign-in" style={styles.switchLink}>
              {glossary.auth.toSignIn}
            </Link>
          </>
        )}
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
