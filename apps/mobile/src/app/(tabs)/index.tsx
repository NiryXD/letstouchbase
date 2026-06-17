import { glossary } from '@ltb/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router'; // [Opus 4.8] Phase 5 paywall navigation
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { LTB } from '@/constants/theme';
import { EmptyState, SourcingArt } from '@/components/illustrations'; // [Opus 4.8] design pass
import { CoverLetterModal } from '@/features/discovery/CoverLetterModal';
import { ResumeCard } from '@/features/discovery/ResumeCard';
import {
  useDeck,
  useRejectCandidate,
  useUndoReject,
  type AnnotatedItem,
  type ResumeCard as Card,
} from '@/lib/discovery';

export default function CandidatesScreen() {
  const { data: deck, isLoading, isError, refetch } = useDeck();
  const reject = useRejectCandidate();
  const undoReject = useUndoReject(); // [Opus 4.8] Counteroffer
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState(0);
  const [annotated, setAnnotated] = useState<AnnotatedItem | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  // [Opus 4.8] last reject, for the Counteroffer (undo) banner
  const [lastReject, setLastReject] = useState<{ userId: string; name: string } | null>(null);

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
    setLastReject({ userId: current.card.userId, name: current.card.firstName });
    advance();
  };

  // [Opus 4.8] Counteroffer — undo the last reject, step back to that card
  const onCounteroffer = () => {
    if (!lastReject) return;
    undoReject.mutate(lastReject.userId);
    setLastReject(null);
    setCursor((c) => Math.max(0, c - 1));
  };

  const refreshDeck = async () => {
    setCursor(0);
    await queryClient.invalidateQueries({ queryKey: ['deck'] });
  };

  if (limitHit) {
    // [Opus 4.8] daily limit now routes to the real paywall (Phase 5)
    return (
      <View style={styles.center}>
        <Text style={styles.limitTitle}>Screening capacity reached</Text>
        <Text style={styles.dim}>{glossary.discovery.dailyLimitReached}</Text>
        <Pressable style={styles.upgrade} onPress={() => router.push('/paywall')}>
          <Text style={styles.upgradeText}>{glossary.premium.paywallTitle}</Text>
        </Pressable>
        <Text style={styles.dimSmall}>Or come back tomorrow — your 8 free screens reset daily.</Text>
      </View>
    );
  }

  if (!current) {
    // [Opus 4.8] illustrated empty state
    return (
      <EmptyState
        art={<SourcingArt />}
        title={glossary.discovery.emptyDeck}
        body="No candidates match your Hiring Criteria right now. Widen your radius or check back soon."
        ctaLabel="Check for new applicants"
        onPressCta={refreshDeck}
      />
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
            setLastReject(null);
            advance();
          }}
          onDailyLimit={() => {
            setAnnotated(null);
            setLimitHit(true);
          }}
        />
      ) : null}
      {/* [Opus 4.8] Counteroffer (undo reject) banner */}
      {lastReject ? (
        <View style={styles.counterBar}>
          <Text style={styles.counterText} numberOfLines={1}>
            {glossary.counteroffer.rejected(lastReject.name)}
          </Text>
          <Pressable onPress={onCounteroffer} hitSlop={8}>
            <Text style={styles.counterUndo}>{glossary.counteroffer.undo}</Text>
          </Pressable>
        </View>
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
  upgrade: {
    backgroundColor: LTB.primary,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
  }, // [Opus 4.8]
  upgradeText: { color: LTB.paper, fontWeight: '700' }, // [Opus 4.8]
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
  // [Opus 4.8] Counteroffer banner
  counterBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: LTB.navy,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  counterText: { color: LTB.paper, flex: 1, marginRight: 12 },
  counterUndo: { color: LTB.gold, fontWeight: '800' },
});
