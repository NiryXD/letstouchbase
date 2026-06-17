// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (Hiring Criteria) ─
import { useAuth } from '@clerk/clerk-expo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from './supabase';

/**
 * Hiring Criteria — the preferences row. Onboarding seeds gender/age/distance;
 * this is the post-onboarding editor for the full set, including the corporate
 * vectors and their per-vector Minimum Qualification (dealbreaker) flags. All
 * free, per the no-feature-gating law — premium buys volume, not filters.
 */
export type Preferences = {
  ageMin: number;
  ageMax: number;
  ageDb: boolean;
  maxDistanceKm: number;
  genders: string[];
  gendersDb: boolean;
  industries: string[];
  industriesDb: boolean;
  archetypes: string[];
  archetypesDb: boolean;
  minDegreeRank: number | null;
  degreeDb: boolean;
  openToWork: string[];
  openToWorkDb: boolean;
};

export function usePreferences() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['preferences', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Preferences | null> => {
      const { data, error } = await supabase
        .from('preferences')
        .select(
          'age_min, age_max, age_db, max_distance_km, genders, genders_db, industries, industries_db, archetypes, archetypes_db, min_degree_rank, degree_db, open_to_work, open_to_work_db',
        )
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ageMin: data.age_min,
        ageMax: data.age_max,
        ageDb: data.age_db,
        maxDistanceKm: data.max_distance_km,
        genders: data.genders ?? [],
        gendersDb: data.genders_db,
        industries: data.industries ?? [],
        industriesDb: data.industries_db,
        archetypes: data.archetypes ?? [],
        archetypesDb: data.archetypes_db,
        minDegreeRank: data.min_degree_rank,
        degreeDb: data.degree_db,
        openToWork: data.open_to_work ?? [],
        openToWorkDb: data.open_to_work_db,
      };
    },
  });
}

/** Map our camelCase patch back to the snake_case preferences columns. */
const COLUMN: Record<keyof Preferences, string> = {
  ageMin: 'age_min',
  ageMax: 'age_max',
  ageDb: 'age_db',
  maxDistanceKm: 'max_distance_km',
  genders: 'genders',
  gendersDb: 'genders_db',
  industries: 'industries',
  industriesDb: 'industries_db',
  archetypes: 'archetypes',
  archetypesDb: 'archetypes_db',
  minDegreeRank: 'min_degree_rank',
  degreeDb: 'degree_db',
  openToWork: 'open_to_work',
  openToWorkDb: 'open_to_work_db',
};

export function useUpdatePreferences() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Preferences>) => {
      const row: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(patch)) {
        row[COLUMN[key as keyof Preferences]] = value;
      }
      const { error } = await supabase.from('preferences').update(row).eq('user_id', userId!);
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ['preferences', userId] });
      const prev = queryClient.getQueryData<Preferences>(['preferences', userId]);
      if (prev) queryClient.setQueryData<Preferences>(['preferences', userId], { ...prev, ...patch });
      return { prev };
    },
    onError: (_e, _patch, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['preferences', userId], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences', userId] });
      queryClient.invalidateQueries({ queryKey: ['deck'] }); // criteria changed → re-fetch deck
    },
  });
}
