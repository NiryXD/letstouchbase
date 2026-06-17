import { glossary } from '@ltb/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LTB } from '@/constants/theme';
import { EmptyState, InboxZeroArt } from '@/components/illustrations'; // [Opus 4.8] design pass
import { OfferExtendedModal } from '@/features/discovery/OfferExtendedModal';
import { ResumeCard } from '@/features/discovery/ResumeCard';
import { photoUrl, useDecideScreen, useInbound, useProfileCard } from '@/lib/discovery';
import { useEntitlements } from '@/lib/entitlements'; // [Opus 4.8] Phase 5 gating
import { supabase } from '@/lib/supabase';

/**
 * Inbound Applications. Free users process the queue one candidate at a time,
 * newest first (Headhunts pinned). The Executive Suite unblurs the grid and
 * lets you jump to anyone — that's the volume/reach the subscription buys.
 */
export default function InboundScreen() {
  const { data: inbound, isLoading } = useInbound();
  const { data: entitlements } = useEntitlements();
  const decide = useDecideScreen();
  const [celebrating, setCelebrating] = useState<string | null>(null);
  // [Opus 4.8] executives can jump to any application; free users get head only
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const isExecutive = entitlements?.isExecutive ?? false;
  const head = inbound?.[0];
  const active = isExecutive
    ? (inbound?.find((s) => s.id === selectedId) ?? null)
    : (head ?? null);
  const { data: card, isLoading: cardLoading } = useProfileCard(active?.from_user);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={LTB.primary} size="large" />
      </View>
    );
  }

  if (!inbound?.length) {
    // [Opus 4.8] illustrated empty state
    return (
      <View style={styles.flex}>
        <EmptyState
          art={<InboxZeroArt />}
          title="No applications pending"
          body="Your desk is clear. Enviable inbox-zero energy."
        />
        {celebrating ? (
          <OfferExtendedModal name={celebrating} onClose={() => setCelebrating(null)} />
        ) : null}
      </View>
    );
  }

  const onDecide = async (decision: 'accepted' | 'rejected', withLetter?: boolean) => {
    if (!active || !card || decide.isPending) return;
    const letter =
      decision === 'rejected' && withLetter
        ? glossary.rejectionLetterTemplate(card.firstName)
        : undefined;
    await decide.mutateAsync({ screenId: active.id, decision, letter });
    if (decision === 'accepted') setCelebrating(card.firstName);
    setSelectedId(null); // executives return to the grid
  };

  // ── Executive grid view (when nothing is selected) ──────────────────────
  if (isExecutive && !active) {
    return (
      <ApplicationGrid
        screens={inbound}
        onSelect={(id) => setSelectedId(id)}
        footer={
          celebrating ? (
            <OfferExtendedModal name={celebrating} onClose={() => setCelebrating(null)} />
          ) : null
        }
      />
    );
  }

  const activeCardLoading = !!active && cardLoading;

  return (
    <View style={styles.container}>
      {isExecutive ? (
        <Pressable style={styles.back} onPress={() => setSelectedId(null)}>
          <Text style={styles.backText}>‹ Back to grid</Text>
        </Pressable>
      ) : (
        <Text style={styles.queueNote}>
          {inbound.length} application{inbound.length === 1 ? '' : 's'} pending ·{' '}
          {glossary.inbound.blurredHint}
        </Text>
      )}

      {active?.is_headhunt ? (
        <View style={styles.headhunt}>
          <Text style={styles.headhuntText}>★ {glossary.inbound.headhuntFlag}</Text>
        </View>
      ) : null}
      {active?.cover_letter ? (
        <View style={styles.letter}>
          <Text style={styles.letterLabel}>{glossary.actions.coverLetter}</Text>
          <Text style={styles.letterBody}>&ldquo;{active.cover_letter}&rdquo;</Text>
        </View>
      ) : null}

      {activeCardLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={LTB.primary} size="large" />
        </View>
      ) : card ? (
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

      {/* [Opus 4.8] free-tier upsell: tease the locked grid */}
      {!isExecutive ? (
        <Pressable style={styles.locked} onPress={() => router.push('/paywall')}>
          <Text style={styles.lockedTitle}>🔒 {glossary.inbound.gridLockedTitle}</Text>
          <Text style={styles.lockedBody}>{glossary.inbound.gridLockedBody(inbound.length)}</Text>
          <Text style={styles.lockedCta}>{glossary.inbound.gridUpgradeCta} ›</Text>
        </Pressable>
      ) : null}

      {celebrating ? (
        <OfferExtendedModal name={celebrating} onClose={() => setCelebrating(null)} />
      ) : null}
    </View>
  );
}

// [Opus 4.8] Executive unblurred grid — mini profiles for every application.
type InboundLite = { id: number; from_user: string; is_headhunt: boolean };

function ApplicationGrid({
  screens,
  onSelect,
  footer,
}: {
  screens: InboundLite[];
  onSelect: (id: number) => void;
  footer?: React.ReactNode;
}) {
  const ids = screens.map((s) => s.from_user);
  const { data: minis } = useQuery({
    queryKey: ['inbound-minis', ...ids],
    enabled: ids.length > 0,
    queryFn: async (): Promise<Record<string, { first_name: string; headshot?: string }>> => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, first_name')
        .in('user_id', ids);
      if (error) throw error;
      const { data: photos } = await supabase
        .from('photos')
        .select('user_id, storage_path')
        .in('user_id', ids)
        .eq('slot', 'headshot');
      const byUser = new Map((photos ?? []).map((p) => [p.user_id, p.storage_path]));
      return Object.fromEntries(
        profiles.map((p) => [p.user_id, { first_name: p.first_name, headshot: byUser.get(p.user_id) }]),
      );
    },
  });

  return (
    <ScrollView contentContainerStyle={styles.gridContainer}>
      <Text style={styles.gridHint}>{glossary.inbound.gridHint}</Text>
      <View style={styles.grid}>
        {screens.map((s) => {
          const mini = minis?.[s.from_user];
          return (
            <Pressable key={s.id} style={styles.gridCell} onPress={() => onSelect(s.id)}>
              {mini?.headshot ? (
                <Image source={{ uri: photoUrl(mini.headshot) }} style={styles.gridPhoto} />
              ) : (
                <View style={[styles.gridPhoto, styles.gridPhotoEmpty]} />
              )}
              {s.is_headhunt ? <Text style={styles.gridStar}>★</Text> : null}
              <Text style={styles.gridName} numberOfLines={1}>
                {mini?.first_name ?? '…'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {footer}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, // [Opus 4.8]
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { color: LTB.ink, fontWeight: '600', fontSize: 16 },
  sub: { color: LTB.inkSecondary, textAlign: 'center' },
  queueNote: { color: LTB.inkSecondary, fontSize: 12, marginBottom: 10, textAlign: 'center' },
  back: { paddingVertical: 6, marginBottom: 6 },
  backText: { color: LTB.primary, fontWeight: '700' },
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
  acceptBtn: { backgroundColor: LTB.primary, borderRadius: 6, padding: 14, alignItems: 'center' },
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
  // [Opus 4.8] free-tier locked grid upsell
  locked: {
    marginTop: 14,
    backgroundColor: LTB.paper,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: LTB.primary,
    gap: 6,
  },
  lockedTitle: { color: LTB.navy, fontWeight: '700' },
  lockedBody: { color: LTB.inkSecondary, fontSize: 13, lineHeight: 18 },
  lockedCta: { color: LTB.primary, fontWeight: '700', marginTop: 2 },
  // [Opus 4.8] executive grid
  gridContainer: { padding: 16 },
  gridHint: { color: LTB.inkSecondary, fontSize: 12, marginBottom: 12, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCell: { width: '30%', alignItems: 'center', gap: 4 },
  gridPhoto: { width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: LTB.divider },
  gridPhotoEmpty: { borderWidth: 1, borderColor: LTB.divider },
  gridStar: { position: 'absolute', top: 4, right: 8, color: LTB.gold, fontSize: 16, fontWeight: '800' },
  gridName: { color: LTB.ink, fontSize: 13, fontWeight: '600' },
});
