import { useAuth } from '@clerk/clerk-expo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { track } from './observability'; // [Opus 4.8] Phase 6 analytics
import { supabase } from './supabase';

export type MatchRow = {
  id: string;
  user_a: string;
  user_b: string;
  stage_a: string;
  stage_b: string;
  created_at: string;
  ended_at: string | null;
};

export type MatchSummary = {
  matchId: string;
  otherUserId: string;
  /** my side's kanban stage */
  stage: string;
  /** whether I'm the user_a column (needed to move my own stage) */
  iAmA: boolean;
  createdAt: string;
};

export function useMatches() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['matches', userId],
    enabled: !!userId,
    queryFn: async (): Promise<MatchSummary[]> => {
      const { data, error } = await supabase
        .from('matches')
        .select('id, user_a, user_b, stage_a, stage_b, created_at, ended_at')
        .is('ended_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as MatchRow[]).map((m) => {
        const iAmA = m.user_a === userId;
        return {
          matchId: m.id,
          otherUserId: iAmA ? m.user_b : m.user_a,
          stage: iAmA ? m.stage_a : m.stage_b,
          iAmA,
          createdAt: m.created_at,
        };
      });
    },
  });
}

/**
 * [Opus 4.8] Action Required — the anti-ghosting "Your Turn" signal. A match is
 * actionable when the most recent (non-retracted) message came from the other
 * party: they're awaiting your reply. Returns the set of such match ids.
 */
export function useActionRequired(matchIds: string[]) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['action-required', userId, ...matchIds],
    enabled: !!userId && matchIds.length > 0,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from('messages')
        .select('match_id, sender, retracted, created_at')
        .in('match_id', matchIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const seen = new Set<string>();
      const actionable = new Set<string>();
      for (const m of data ?? []) {
        if (seen.has(m.match_id)) continue; // first row per match = latest
        seen.add(m.match_id);
        if (!m.retracted && m.sender !== userId) actionable.add(m.match_id);
      }
      return actionable;
    },
  });
}

export function useSetStage() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { matchId: string; stage: string; iAmA: boolean }) => {
      // each side moves only its own column (doc 08 lifecycle invariant)
      const { error } = await supabase
        .from('matches')
        .update(input.iAmA ? { stage_a: input.stage } : { stage_b: input.stage })
        .eq('id', input.matchId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['matches', userId] }),
  });
}

export function useTerminate() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase
        .from('matches')
        .update({ ended_at: new Date().toISOString(), ended_by: userId })
        .eq('id', matchId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['matches', userId] }),
  });
}

// [Opus 4.8] useSubmitExitInterview — authored by Claude Opus 4.8 this session
/**
 * Exit Interview — the "We Met" feedback loop, filed after a Termination.
 * Confidential and owner-scoped via RLS; one per (match, user). A duplicate
 * (23505) means it was already filed — treated as success.
 */
export function useSubmitExitInterview() {
  const { userId } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      matchId: string;
      met: boolean;
      outcome: 'great' | 'fine' | 'poor' | 'no_show';
      note?: string;
    }) => {
      const { error } = await supabase.from('exit_interviews').insert({
        match_id: input.matchId,
        user_id: userId!,
        met: input.met,
        outcome: input.outcome,
        note: input.note?.trim() ? input.note.trim() : null,
      });
      if (error && error.code !== '23505') throw error;
    },
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (target: string) => {
      const { error } = await supabase.rpc('ltb_block_user', { target });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['inbound'] });
      queryClient.invalidateQueries({ queryKey: ['deck'] });
    },
  });
}

export function useReport() {
  const { userId } = useAuth();
  return useMutation({
    mutationFn: async (input: { reported: string; reason: string; detail?: string }) => {
      const { error } = await supabase.from('reports').insert({
        reporter: userId!,
        reported: input.reported,
        reason: input.reason,
        detail: input.detail ?? null,
      });
      if (error) throw error;
    },
  });
}

export type Message = {
  id: number;
  match_id: string;
  sender: string;
  body: string;
  created_at: string;
  retracted: boolean;
};

export function useMessages(matchId: string | undefined) {
  const queryClient = useQueryClient();

  // realtime: new/updated rows land in the query cache
  useEffect(() => {
    if (!matchId) return;
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', matchId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, queryClient]);

  return useQuery({
    queryKey: ['messages', matchId],
    enabled: !!matchId,
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, match_id, sender, body, created_at, retracted')
        .eq('match_id', matchId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useSendMessage(matchId: string | undefined) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase
        .from('messages')
        .insert({ match_id: matchId!, sender: userId!, body });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', matchId] });
      track('message_sent'); // [Opus 4.8] Phase 6 analytics
    },
  });
}

/** "Retract Statement" — free, per the no-feature-gating law */
export function useRetractMessage(matchId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: number) => {
      const { error } = await supabase
        .from('messages')
        .update({ retracted: true })
        .eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', matchId] }),
  });
}
