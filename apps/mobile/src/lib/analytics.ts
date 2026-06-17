// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (Phase 4) ───────
import { useAuth } from '@clerk/clerk-expo';
import { useQuery } from '@tanstack/react-query';

import { supabase } from './supabase';

/**
 * Quarterly Performance Review — the caller's own funnel metrics. Computed
 * server-side by ltb_performance_review(), which scopes every clause to
 * ltb_uid(): a user can only ever read their own numbers.
 */
export type PerformanceReview = {
  impressions: number;
  screensReceived: number;
  screensPending: number;
  screensSent: number;
  screensAccepted: number;
  offers: number;
  activeOffers: number;
  endorsements: number;
  references: number;
  desirability: number;
  completeness: number;
  memberSince: string;
};

export function usePerformanceReview() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['performance-review', userId],
    enabled: !!userId,
    queryFn: async (): Promise<PerformanceReview> => {
      const { data, error } = await supabase.rpc('ltb_performance_review');
      if (error) throw error;
      return data as PerformanceReview;
    },
  });
}
