// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (Phase 4) ───────
import { ENDORSABLE_SKILLS, glossary } from '@ltb/shared';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LTB } from '@/constants/theme';
import { useEndorse } from '@/lib/endorsements';

/**
 * Endorse a matched colleague's core competencies. Tapping a chip files the
 * endorsement; the server enforces match-gating and one-per-skill, so this is
 * deliberately optimistic — a tapped chip just marks itself done.
 */
export function EndorseModal({
  name,
  targetUserId,
  onClose,
}: {
  name: string;
  targetUserId: string;
  onClose: () => void;
}) {
  const endorse = useEndorse(targetUserId);
  const [endorsed, setEndorsed] = useState<Set<string>>(new Set());

  const onEndorse = async (skill: string) => {
    if (endorsed.has(skill)) return;
    setEndorsed((prev) => new Set(prev).add(skill));
    try {
      await endorse.mutateAsync(skill);
    } catch {
      // roll the chip back so the user can retry
      setEndorsed((prev) => {
        const next = new Set(prev);
        next.delete(skill);
        return next;
      });
    }
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.letterhead}>{glossary.endorsements.title.toUpperCase()}</Text>
          <View style={styles.rule} />
          <Text style={styles.title}>Endorse {name}</Text>
          <Text style={styles.sub}>{glossary.endorsements.sub}</Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {ENDORSABLE_SKILLS.map((skill) => {
              const done = endorsed.has(skill);
              return (
                <Pressable
                  key={skill}
                  style={[styles.chip, done && styles.chipDone]}
                  disabled={done}
                  onPress={() => onEndorse(skill)}>
                  <Text style={[styles.chipText, done && styles.chipTextDone]}>
                    {done ? '✓ ' : '+ '}
                    {skill}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {endorsed.size > 0 ? <Text style={styles.done}>{glossary.endorsements.done}</Text> : null}
          <Pressable style={styles.cta} onPress={onClose}>
            <Text style={styles.ctaText}>Done</Text>
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
  sheet: { backgroundColor: LTB.paper, borderRadius: 8, padding: 24, maxHeight: '80%' },
  letterhead: { color: LTB.primary, fontWeight: '800', letterSpacing: 2, fontSize: 12 },
  rule: { height: 2, backgroundColor: LTB.primary, marginVertical: 12 },
  title: { color: LTB.navy, fontWeight: '800', fontSize: 20, marginBottom: 6 },
  sub: { color: LTB.inkSecondary, marginBottom: 12, lineHeight: 19 },
  list: { flexGrow: 0 },
  listContent: { gap: 8, paddingBottom: 4 },
  chip: {
    borderWidth: 1,
    borderColor: LTB.divider,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: LTB.paper,
  },
  chipDone: { borderColor: LTB.primary, backgroundColor: LTB.feedGray },
  chipText: { color: LTB.ink, fontWeight: '600' },
  chipTextDone: { color: LTB.primary },
  done: { color: LTB.primary, fontSize: 12, marginTop: 12, textAlign: 'center' },
  cta: {
    backgroundColor: LTB.primary,
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  ctaText: { color: LTB.paper, fontWeight: '700', fontSize: 16 },
});
