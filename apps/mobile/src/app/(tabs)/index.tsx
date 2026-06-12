import { glossary } from '@ltb/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { LTB } from '@/constants/theme';
import { CoverLetterModal } from '@/features/discovery/CoverLetterModal';
import { ResumeCard } from '@/features/discovery/ResumeCard';
import {
  useDeck,
  useRejectCandidate,
  type AnnotatedItem,
  type ResumeCard as Card,
} from '@/lib/discovery';

export default function CandidatesScreen() {
  const { data: deck, isLoading, isError, refetch } = useDeck();
  const reject = useRejectCandidate();
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState(0);
  const [annotated, setAnnotated] = useState<AnnotatedItem | null>(null);
  const [limitHit, setLimitHit] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={LTB.primary} size="large" />
        <Text style={styles.dim}>Sourcing candidates…</Text>
      </View>
    );
  }
  if (isError || !deck) {
    return (
      <View style={styles.center}>
        <Text style={styles.dim}>Couldn't reach the talent pool.</Text>
        <Pressable style={styles.refresh} onPress={() => refetch()}>
          <Text style={styles.refreshText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  // Recruiter's Pick leads, then the ranked deck
  const queue: { card: Card; isPick: boolean }[] = [
    ...(deck.pick ? [{ card: deck.pick, isPick: true }] : []),
    ...deck.candidates.map((card) => ({ card, isPick: false })),
  ];
  const current = queue[cursor];

  const advance = () => setCursor((c) => c + 1);

  const onReject = () => {
    if (!current) return;
    reject.mutate(current.card.userId);
    advance();
  };

  const refreshDeck = async () => {
    setCursor(0);
    await queryClient.invalidateQueries({ queryKey: ['deck'] });
  };

  if (limitHit) {
    return (
      <View style={styles.center}>
        <Text style={styles.limitTitle}>Screening capacity reached</Text>
        <Text style={styles.dim}>{glossary.discovery.dailyLimitReached}</Text>
        <Text style={styles.dimSmall}>
          ({glossary.premium.tierName} arrives in Phase 5 — for now, come back tomorrow.)
        </Text>
      </View>
    );
  }

  if (!current) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>{glossary.discovery.emptyDeck}</Text>
        <Pressable style={styles.refresh} onPress={refreshDeck}>
          <Text style={styles.refreshText}>Check for new applicants</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {deck.widened ? (
        <Text style={styles.widened}>{glossary.discovery.expandingRadius}</Text>
      ) : null}
      {current.isPick ? (
        <View style={styles.pickBanner}>
          <Text style={styles.pickText}>★ {glossary.discovery.recruitersPick}</Text>
        </View>
      ) : null}
      <ResumeCard
        card={current.card}
        onAnnotate={setAnnotated}
        footer={
          <Pressable style={styles.rejectBtn} onPress={onReject}>
            <Text style={styles.rejectText}>{glossary.actions.reject}</Text>
          </Pressable>
        }
      />
      {annotated ? (
        <CoverLetterModal
          target={current.card.userId}
          targetName={current.card.firstName}
          annotated={annotated}
          onClose={() => setAnnotated(null)}
          onSent={() => {
            setAnnotated(null);
            advance();
          }}
          onDailyLimit={() => {
            setAnnotated(null);
            setLimitHit(true);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  dim: { color: LTB.inkSecondary, textAlign: 'center' },
  dimSmall: { color: LTB.inkSecondary, textAlign: 'center', fontSize: 12 },
  emptyTitle: { color: LTB.ink, fontWeight: '600', fontSize: 16, textAlign: 'center' },
  limitTitle: { color: LTB.navy, fontWeight: '700', fontSize: 18 },
  refresh: {
    borderWidth: 1,
    borderColor: LTB.primary,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  refreshText: { color: LTB.primary, fontWeight: '600' },
  widened: { color: LTB.inkSecondary, fontSize: 12, textAlign: 'center', marginBottom: 8 },
  pickBanner: {
    backgroundColor: LTB.paper,
    borderLeftWidth: 4,
    borderLeftColor: LTB.gold,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  pickText: { color: LTB.gold, fontWeight: '700' },
  rejectBtn: {
    borderWidth: 1,
    borderColor: LTB.reject,
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
    backgroundColor: LTB.paper,
  },
  rejectText: { color: LTB.reject, fontWeight: '700' },
});
