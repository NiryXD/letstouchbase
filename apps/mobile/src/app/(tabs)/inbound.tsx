import { glossary } from '@ltb/shared';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { LTB } from '@/constants/theme';
import { OfferExtendedModal } from '@/features/discovery/OfferExtendedModal';
import { ResumeCard } from '@/features/discovery/ResumeCard';
import { useDecideScreen, useInbound, useProfileCard } from '@/lib/discovery';

/**
 * Free-tier inbound: one application at a time, newest first (Headhunts pinned).
 * The unblurred grid is the Executive Suite feature — Phase 5.
 */
export default function InboundScreen() {
  const { data: inbound, isLoading } = useInbound();
  const head = inbound?.[0];
  const { data: card, isLoading: cardLoading } = useProfileCard(head?.from_user);
  const decide = useDecideScreen();
  const [celebrating, setCelebrating] = useState<string | null>(null);

  if (isLoading || (head && cardLoading)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={LTB.primary} size="large" />
      </View>
    );
  }

  if (!head) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>No applications pending.</Text>
        <Text style={styles.sub}>Your desk is clear. Enviable inbox-zero energy.</Text>
        {celebrating ? (
          <OfferExtendedModal name={celebrating} onClose={() => setCelebrating(null)} />
        ) : null}
      </View>
    );
  }

  const onDecide = async (decision: 'accepted' | 'rejected', withLetter?: boolean) => {
    if (!card || decide.isPending) return;
    const letter =
      decision === 'rejected' && withLetter
        ? glossary.rejectionLetterTemplate(card.firstName)
        : undefined;
    await decide.mutateAsync({ screenId: head.id, decision, letter });
    if (decision === 'accepted') setCelebrating(card.firstName);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.queueNote}>
        {inbound!.length} application{inbound!.length === 1 ? '' : 's'} pending ·{' '}
        {glossary.inbound.blurredHint}
      </Text>
      {head.is_headhunt ? (
        <View style={styles.headhunt}>
          <Text style={styles.headhuntText}>★ {glossary.inbound.headhuntFlag}</Text>
        </View>
      ) : null}
      {head.cover_letter ? (
        <View style={styles.letter}>
          <Text style={styles.letterLabel}>{glossary.actions.coverLetter}</Text>
          <Text style={styles.letterBody}>"{head.cover_letter}"</Text>
        </View>
      ) : null}
      {card ? (
        <ResumeCard
          card={card}
          onAnnotate={() => {}}
          footer={
            <View style={styles.actions}>
              <Pressable
                style={styles.rejectBtn}
                disabled={decide.isPending}
                onPress={() => onDecide('rejected', true)}>
                <Text style={styles.rejectText}>Send {glossary.actions.rejectionLetter}</Text>
              </Pressable>
              <Pressable
                style={styles.acceptBtn}
                disabled={decide.isPending}
                onPress={() => onDecide('accepted')}>
                {decide.isPending ? (
                  <ActivityIndicator color={LTB.paper} />
                ) : (
                  <Text style={styles.acceptText}>Extend Offer</Text>
                )}
              </Pressable>
            </View>
          }
        />
      ) : null}
      {celebrating ? (
        <OfferExtendedModal name={celebrating} onClose={() => setCelebrating(null)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { color: LTB.ink, fontWeight: '600', fontSize: 16 },
  sub: { color: LTB.inkSecondary, textAlign: 'center' },
  queueNote: { color: LTB.inkSecondary, fontSize: 12, marginBottom: 10, textAlign: 'center' },
  headhunt: {
    backgroundColor: LTB.paper,
    borderLeftWidth: 4,
    borderLeftColor: LTB.gold,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  headhuntText: { color: LTB.gold, fontWeight: '700' },
  letter: {
    backgroundColor: LTB.paper,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: LTB.primary,
  },
  letterLabel: { color: LTB.primary, fontWeight: '700', fontSize: 12, marginBottom: 4 },
  letterBody: { color: LTB.ink, fontStyle: 'italic', lineHeight: 20 },
  actions: { gap: 10 },
  acceptBtn: {
    backgroundColor: LTB.primary,
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
  },
  acceptText: { color: LTB.paper, fontWeight: '700' },
  rejectBtn: {
    borderWidth: 1,
    borderColor: LTB.reject,
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
    backgroundColor: LTB.paper,
  },
  rejectText: { color: LTB.reject, fontWeight: '600' },
});
