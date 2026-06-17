// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (Phase 5) ───────
import { useAuth } from '@clerk/clerk-expo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from './supabase';

/**
 * Entitlements are read straight from the DB row maintained by the
 * revenuecat-webhook — the authoritative state. A missing row means a free
 * user with no credits. The server independently enforces every limit
 * (ltb_request_screen, ltb_activate_boost), so this is purely for the UI.
 */
export type Entitlements = {
  isExecutive: boolean;
  headhuntCredits: number;
  boostCredits: number;
};

const FREE: Entitlements = { isExecutive: false, headhuntCredits: 0, boostCredits: 0 };

export function useEntitlements() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['entitlements', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Entitlements> => {
      const { data, error } = await supabase
        .from('entitlements')
        .select('is_executive, headhunt_credits, boost_credits')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return FREE;
      return {
        isExecutive: data.is_executive,
        headhuntCredits: data.headhunt_credits,
        boostCredits: data.boost_credits,
      };
    },
  });
}

/**
 * After a store purchase the webhook updates the DB asynchronously, so poll
 * the entitlements row briefly until it reflects the change.
 */
export function useRefreshEntitlements() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return async (attempts = 5, delayMs = 1500) => {
    for (let i = 0; i < attempts; i++) {
      await queryClient.invalidateQueries({ queryKey: ['entitlements', userId] });
      await new Promise((r) => setTimeout(r, delayMs));
    }
  };
}

/** Spend one Expedited Review credit → 30-minute top-of-deck boost. */
export function useActivateBoost() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ boostedUntil: string }> => {
      const { data, error } = await supabase.rpc('ltb_activate_boost');
      if (error) throw error;
      return data as { boostedUntil: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['entitlements', userId] }),
  });
}
