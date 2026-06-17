import { glossary, LIMITS } from '@ltb/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { LTB } from '@/constants/theme';
import { useRequestScreen, type AnnotatedItem } from '@/lib/discovery';
import { useEntitlements } from '@/lib/entitlements'; // [Opus 4.8] Phase 5 Headhunt option

export function CoverLetterModal({
  target,
  targetName,
  annotated,
  onClose,
  onSent,
  onDailyLimit,
}: {
  target: string;
  targetName: string;
  annotated: AnnotatedItem;
  onClose: () => void;
  onSent: () => void;
  onDailyLimit: () => void;
}) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [asHeadhunt, setAsHeadhunt] = useState(false);
  const requestScreen = useRequestScreen();
  // [Opus 4.8] Headhunt is a consumable: only offer it when credits exist.
  const { data: entitlements } = useEntitlements();
  const queryClient = useQueryClient();
  const headhuntCredits = entitlements?.headhuntCredits ?? 0;

  const send = async () => {
    if (!body.trim() || requestScreen.isPending) return;
    setError(null);
    const headhunt = asHeadhunt && headhuntCredits > 0;
    try {
      await requestScreen.mutateAsync({ target, letter: body.trim(), annotated, headhunt });
      if (headhunt) {
        queryClient.invalidateQueries({ queryKey: ['entitlements'] });
      }
      onSent();
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? '';
      if (msg.includes('DAILY_LIMIT')) {
        onDailyLimit();
      } else {
        setError(msg || 'Failed to send. Try again.');
      }
    }
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{glossary.actions.coverLetter}</Text>
          <Text style={styles.sub}>
            Re: {annotated.excerpt} — to {targetName}
          </Text>
          <TextInput
            style={styles.input}
            multiline
            autoFocus
            maxLength={LIMITS.coverLetterMaxChars}
            placeholder="Dear candidate, I was impressed by…"
            placeholderTextColor={LTB.inkSecondary}
            value={body}
            onChangeText={setBody}
          />
          <Text style={styles.count}>
            {body.length}/{LIMITS.coverLetterMaxChars}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {/* [Opus 4.8] Headhunt consumable option (Phase 5) */}
          {headhuntCredits > 0 ? (
            <Pressable style={styles.headhuntRow} onPress={() => setAsHeadhunt((v) => !v)}>
              <View style={[styles.checkbox, asHeadhunt && styles.checkboxOn]}>
                {asHeadhunt ? <Text style={styles.checkboxMark}>★</Text> : null}
              </View>
              <View style={styles.headhuntMeta}>
                <Text style={styles.headhuntLabel}>{glossary.premium.headhuntSendOption}</Text>
                <Text style={styles.headhuntHint}>
                  {glossary.premium.headhuntSub} · {glossary.premium.headhuntCredits(headhuntCredits)}
                </Text>
              </View>
            </Pressable>
          ) : (
            <Pressable style={styles.headhuntUpsell} onPress={() => router.push('/discretionary-budget')}>
              <Text style={styles.headhuntUpsellText}>★ {glossary.premium.headhuntNone}</Text>
            </Pressable>
          )}
          <View style={styles.row}>
            <Pressable style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>Withdraw</Text>
            </Pressable>
            <Pressable
              style={[styles.send, !body.trim() && styles.disabled]}
              disabled={!body.trim() || requestScreen.isPending}
              onPress={send}>
              {requestScreen.isPending ? (
                <ActivityIndicator color={LTB.paper} />
              ) : (
                <Text style={styles.sendText}>
                  {asHeadhunt && headhuntCredits > 0
                    ? `${glossary.actions.headhunt} ★`
                    : glossary.actions.screen}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(29,34,38,0.5)' },
  sheet: {
    backgroundColor: LTB.paper,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 20,
    paddingBottom: 32,
  },
  title: { color: LTB.navy, fontWeight: '700', fontSize: 18 },
  sub: { color: LTB.inkSecondary, marginTop: 4, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: LTB.divider,
    borderRadius: 6,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    color: LTB.ink,
    marginTop: 12,
  },
  count: { color: LTB.inkSecondary, fontSize: 11, textAlign: 'right', marginTop: 4 },
  error: { color: LTB.reject, marginTop: 8 },
  // [Opus 4.8] Headhunt option styles (Phase 5)
  headhuntRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: LTB.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: LTB.gold },
  checkboxMark: { color: LTB.paper, fontWeight: '800', fontSize: 13 },
  headhuntMeta: { flex: 1 },
  headhuntLabel: { color: LTB.ink, fontWeight: '600' },
  headhuntHint: { color: LTB.inkSecondary, fontSize: 11, marginTop: 1 },
  headhuntUpsell: { marginTop: 8 },
  headhuntUpsellText: { color: LTB.gold, fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: LTB.divider,
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
  },
  cancelText: { color: LTB.inkSecondary, fontWeight: '600' },
  send: {
    flex: 2,
    backgroundColor: LTB.primary,
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
  sendText: { color: LTB.paper, fontWeight: '700' },
});
