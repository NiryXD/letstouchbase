import { glossary, PIPELINE_STAGES } from '@ltb/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LTB } from '@/constants/theme';
import { EmptyPipelineArt, EmptyState } from '@/components/illustrations'; // [Opus 4.8] design pass
import { photoUrl } from '@/lib/discovery';
import { useActionRequired, useMatches, useSetStage, type MatchSummary } from '@/lib/matches';
import { supabase } from '@/lib/supabase';

const STAGE_LABELS: Record<string, string> = Object.fromEntries(
  PIPELINE_STAGES.map((key, i) => [key, glossary.pipeline.stages[i]]),
);

type Mini = { user_id: string; first_name: string; headline: string; headshot?: string };

function useMiniProfiles(ids: string[]) {
  return useQuery({
    queryKey: ['mini-profiles', ...ids],
    enabled: ids.length > 0,
    queryFn: async (): Promise<Record<string, Mini>> => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, headline')
        .in('user_id', ids);
      if (error) throw error;
      const { data: photos } = await supabase
        .from('photos')
        .select('user_id, storage_path')
        .in('user_id', ids)
        .eq('slot', 'headshot');
      const bySlot = new Map((photos ?? []).map((p) => [p.user_id, p.storage_path]));
      return Object.fromEntries(
        profiles.map((p) => [p.user_id, { ...p, headshot: bySlot.get(p.user_id) }]),
      );
    },
  });
}

// stages are self-organized: cycle through the columns (wraps around)
function nextStage(stage: string): string {
  const i = PIPELINE_STAGES.indexOf(stage as (typeof PIPELINE_STAGES)[number]);
  return PIPELINE_STAGES[(i + 1) % PIPELINE_STAGES.length];
}

export default function PipelineScreen() {
  const { data: matches } = useMatches();
  const minis = useMiniProfiles((matches ?? []).map((m) => m.otherUserId));
  const setStage = useSetStage();
  // [Opus 4.8] Action Required — matches awaiting your reply
  const { data: actionable } = useActionRequired((matches ?? []).map((m) => m.matchId));

  if (!matches?.length) {
    // [Opus 4.8] illustrated empty state
    return (
      <EmptyState
        art={<EmptyPipelineArt />}
        title="Pipeline empty"
        body="Extend some offers — candidates land here once an offer is accepted."
      />
    );
  }

  const byStage = new Map<string, MatchSummary[]>();
  for (const m of matches) {
    byStage.set(m.stage, [...(byStage.get(m.stage) ?? []), m]);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {PIPELINE_STAGES.map((stage) => {
        const rows = byStage.get(stage) ?? [];
        if (!rows.length) return null;
        return (
          <View key={stage} style={styles.column}>
            <Text style={styles.stage}>{STAGE_LABELS[stage]}</Text>
            {rows.map((m) => {
              const mini = minis.data?.[m.otherUserId];
              return (
                <Pressable
                  key={m.matchId}
                  style={styles.row}
                  onPress={() =>
                    router.push({
                      pathname: '/match/[id]',
                      params: { id: m.matchId, other: m.otherUserId },
                    })
                  }>
                  {mini?.headshot ? (
                    <Image source={{ uri: photoUrl(mini.headshot) }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarEmpty]} />
                  )}
                  <View style={styles.rowMeta}>
                    <Text style={styles.rowName}>{mini?.first_name ?? '…'}</Text>
                    {actionable?.has(m.matchId) ? (
                      <Text style={styles.actionRequired}>● {glossary.pipeline.actionRequired}</Text>
                    ) : (
                      <Text style={styles.rowHeadline} numberOfLines={1}>
                        {mini?.headline ?? ''}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    style={styles.advance}
                    onPress={() =>
                      setStage.mutate({
                        matchId: m.matchId,
                        stage: nextStage(m.stage),
                        iAmA: m.iAmA,
                      })
                    }>
                    <Text style={styles.advanceText}>→</Text>
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { color: LTB.ink, fontWeight: '600', fontSize: 16 },
  sub: { color: LTB.inkSecondary, textAlign: 'center' },
  column: {
    backgroundColor: LTB.paper,
    borderRadius: 8,
    padding: 14,
    borderTopWidth: 3,
    borderTopColor: LTB.primary,
  },
  stage: { color: LTB.navy, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: LTB.divider },
  avatarEmpty: { borderWidth: 1, borderColor: LTB.divider },
  rowMeta: { flex: 1 },
  rowName: { color: LTB.ink, fontWeight: '600' },
  rowHeadline: { color: LTB.inkSecondary, fontSize: 12 },
  actionRequired: { color: LTB.gold, fontSize: 12, fontWeight: '700' }, // [Opus 4.8]
  advance: { padding: 8 },
  advanceText: { color: LTB.primary, fontSize: 18, fontWeight: '700' },
});
