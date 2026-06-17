// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (Phase 4) ───────
import { EXIT_OUTCOMES, glossary, type ExitOutcome } from '@ltb/shared';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { LTB } from '@/constants/theme';

/**
 * Exit Interview — the "We Met" feedback loop, surfaced right after a
 * Termination. Confidential (owner-scoped via RLS); the other side never sees
 * it. The user can always decline to comment. Submission is delegated to the
 * caller so this component stays presentational.
 */
export function ExitInterviewModal({
  name,
  submitting,
  onSubmit,
  onSkip,
}: {
  name: string;
  submitting: boolean;
  onSubmit: (input: { met: boolean; outcome: ExitOutcome; note: string }) => void;
  onSkip: () => void;
}) {
  const [met, setMet] = useState<boolean | null>(null);
  const [outcome, setOutcome] = useState<ExitOutcome | null>(null);
  const [note, setNote] = useState('');

  const canSubmit = met !== null && outcome !== null && !submitting;

  return (
    <Modal transparent animationType="fade" onRequestClose={onSkip}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.letterhead}>{glossary.exitInterview.title.toUpperCase()}</Text>
          <View style={styles.rule} />
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.intro}>
              Re: {name}. {glossary.exitInterview.intro}
            </Text>

            <Text style={styles.q}>{glossary.exitInterview.metQuestion}</Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.toggle, met === true && styles.toggleOn]}
                onPress={() => setMet(true)}>
                <Text style={[styles.toggleText, met === true && styles.toggleTextOn]}>
                  {glossary.exitInterview.metYes}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggle, met === false && styles.toggleOn]}
                onPress={() => setMet(false)}>
                <Text style={[styles.toggleText, met === false && styles.toggleTextOn]}>
                  {glossary.exitInterview.metNo}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.q}>{glossary.exitInterview.outcomeQuestion}</Text>
            <View style={styles.options}>
              {EXIT_OUTCOMES.map((o) => (
                <Pressable
                  key={o}
                  style={[styles.option, outcome === o && styles.optionOn]}
                  onPress={() => setOutcome(o)}>
                  <Text style={[styles.optionText, outcome === o && styles.optionTextOn]}>
                    {glossary.exitInterview.outcomes[o]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.q}>{glossary.exitInterview.noteLabel}</Text>
            <TextInput
              style={styles.note}
              value={note}
              onChangeText={setNote}
              placeholder="For the record…"
              placeholderTextColor={LTB.inkSecondary}
              multiline
              maxLength={500}
            />
          </ScrollView>

          <Pressable
            style={[styles.cta, !canSubmit && styles.ctaDisabled]}
            disabled={!canSubmit}
            onPress={() => onSubmit({ met: met!, outcome: outcome!, note })}>
            <Text style={styles.ctaText}>{glossary.exitInterview.submit}</Text>
          </Pressable>
          <Pressable style={styles.skip} disabled={submitting} onPress={onSkip}>
            <Text style={styles.skipText}>{glossary.exitInterview.skip}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(29,34,38,0.6)',
  },
  sheet: { backgroundColor: LTB.paper, borderRadius: 8, padding: 24, maxHeight: '85%' },
  letterhead: { color: LTB.primary, fontWeight: '800', letterSpacing: 2, fontSize: 12 },
  rule: { height: 2, backgroundColor: LTB.primary, marginVertical: 12 },
  body: { gap: 10, paddingBottom: 4 },
  intro: { color: LTB.inkSecondary, lineHeight: 19, marginBottom: 4 },
  q: { color: LTB.navy, fontWeight: '700', marginTop: 8 },
  row: { flexDirection: 'row', gap: 10 },
  toggle: {
    flex: 1,
    borderWidth: 1,
    borderColor: LTB.divider,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleOn: { borderColor: LTB.primary, backgroundColor: LTB.feedGray },
  toggleText: { color: LTB.ink, fontWeight: '600' },
  toggleTextOn: { color: LTB.primary },
  options: { gap: 8 },
  option: {
    borderWidth: 1,
    borderColor: LTB.divider,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optionOn: { borderColor: LTB.primary, backgroundColor: LTB.feedGray },
  optionText: { color: LTB.ink, fontWeight: '600' },
  optionTextOn: { color: LTB.primary },
  note: {
    borderWidth: 1,
    borderColor: LTB.divider,
    borderRadius: 8,
    padding: 10,
    minHeight: 64,
    color: LTB.ink,
    textAlignVertical: 'top',
  },
  cta: {
    backgroundColor: LTB.primary,
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: LTB.paper, fontWeight: '700', fontSize: 16 },
  skip: { padding: 12, alignItems: 'center', marginTop: 4 },
  skipText: { color: LTB.inkSecondary, fontWeight: '600' },
});
