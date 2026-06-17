// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (Phase 4) ───────
import { useAuth } from '@clerk/clerk-expo';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from './supabase';

/**
 * Endorse a colleague's core competency. Server-side RLS enforces the rest:
 * you may only endorse someone you're matched with, only as yourself, and the
 * unique(user_id, skill, endorser_id) constraint caps it at one per skill.
 * A duplicate (23505) means "already endorsed" — we treat that as success so
 * the UI stays idempotent.
 */
export function useEndorse(targetUserId: string | undefined) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (skill: string) => {
      const { error } = await supabase
        .from('endorsements')
        .insert({ user_id: targetUserId!, skill, endorser_id: userId! });
      if (error && error.code !== '23505') throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-card', targetUserId] });
    },
  });
}
