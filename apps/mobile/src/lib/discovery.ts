import { useAuth } from '@clerk/clerk-expo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { track } from './observability'; // [Opus 4.8] Phase 6 analytics
import { supabase } from './supabase';

export type CardPhoto = { id: number; slot: string; path: string };
export type CardAnswer = { id: number; question: string; answer: string };
export type CardExperience = {
  id: number;
  title: string;
  company: string | null;
  industry: string;
  startYear: number;
  endYear: number | null;
  oneLiner: string | null;
};
export type CardEducation = {
  id: number;
  school: string;
  degreeLevel: string;
  field: string | null;
  classYear: number;
};
export type CardReference = {
  id: number;
  authorName: string;
  relationship: string | null;
  body: string;
};
// [Opus 4.8] CardEndorsement + endorsements field — authored this session
export type CardEndorsement = { skill: string; count: number };

export type ResumeCard = {
  userId: string;
  firstName: string;
  age: number;
  headline: string;
  executiveSummary: string | null;
  currentTitle: string | null;
  employer: string | null;
  industry: string | null;
  archetype: string | null;
  openToWork: 'committed' | 'casual' | 'networking';
  outOfOffice: boolean;
  photos: CardPhoto[];
  answers: CardAnswer[];
  experience: CardExperience[];
  education: CardEducation[];
  references: CardReference[];
  endorsements: CardEndorsement[];
};

export type Deck = { widened: boolean; pick: ResumeCard | null; candidates: ResumeCard[] };

export type AnnotatedItem = {
  kind: 'photo' | 'behavioral_answer' | 'experience' | 'education' | 'headline';
  id: string;
  /** what the cover letter quotes, for display */
  excerpt: string;
};

export function useDeck() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['deck', userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Deck> => {
      const { data, error } = await supabase.rpc('ltb_get_deck');
      if (error) throw error;
      return data as Deck;
    },
  });
}

export function useRequestScreen() {
  return useMutation({
    mutationFn: async (input: {
      target: string;
      letter: string;
      annotated: AnnotatedItem;
      headhunt?: boolean;
    }) => {
      const { error } = await supabase.rpc('ltb_request_screen', {
        target: input.target,
        letter: input.letter,
        annotated_kind: input.annotated.kind,
        annotated_id: input.annotated.id,
        headhunt: input.headhunt ?? false,
      });
      if (error) throw error;
    },
    // [Opus 4.8] Phase 6 analytics
    onSuccess: (_d, input) =>
      track('screen_requested', { headhunt: input.headhunt ?? false, kind: input.annotated.kind }),
  });
}

export function useRejectCandidate() {
  const { userId } = useAuth();
  return useMutation({
    mutationFn: async (target: string) => {
      const { error } = await supabase
        .from('rejects')
        .insert({ from_user: userId!, to_user: target });
      if (error && error.code !== '23505') throw error; // duplicate pass is fine
    },
    onSuccess: () => track('candidate_rejected'), // [Opus 4.8] Phase 6 analytics
  });
}

// [Opus 4.8] Counteroffer — undo a Reject Candidate (free, per the plan).
export function useUndoReject() {
  const { userId } = useAuth();
  return useMutation({
    mutationFn: async (target: string) => {
      const { error } = await supabase
        .from('rejects')
        .delete()
        .eq('from_user', userId!)
        .eq('to_user', target);
      if (error) throw error;
    },
    onSuccess: () => track('counteroffer'),
  });
}

export type InboundScreen = {
  id: number;
  from_user: string;
  cover_letter: string | null;
  annotated_kind: string | null;
  annotated_id: string | null;
  is_headhunt: boolean;
  created_at: string;
};

export function useInbound() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['inbound', userId],
    enabled: !!userId,
    queryFn: async (): Promise<InboundScreen[]> => {
      const { data, error } = await supabase
        .from('screens')
        .select('id, from_user, cover_letter, annotated_kind, annotated_id, is_headhunt, created_at')
        .eq('to_user', userId!)
        .eq('status', 'pending')
        .order('is_headhunt', { ascending: false }) // Headhunts pin to the top
        .order('created_at', { ascending: false }); // then newest-first
      if (error) throw error;
      return data;
    },
  });
}

export function useProfileCard(uid: string | undefined) {
  return useQuery({
    queryKey: ['profile-card', uid],
    enabled: !!uid,
    queryFn: async (): Promise<ResumeCard> => {
      const { data, error } = await supabase.rpc('ltb_profile_card', { uid: uid! });
      if (error) throw error;
      return data as ResumeCard;
    },
  });
}

export function useDecideScreen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      screenId: number;
      decision: 'accepted' | 'rejected';
      letter?: string;
    }) => {
      const { data, error } = await supabase.rpc('ltb_decide_screen', {
        screen_id: input.screenId,
        decision: input.decision,
        letter: input.letter ?? null,
      });
      if (error) throw error;
      return data as { ok: boolean; matchId?: string };
    },
    onSuccess: (data, input) => {
      queryClient.invalidateQueries({ queryKey: ['inbound'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      // [Opus 4.8] Phase 6 analytics — a match is the key conversion event
      track('screen_decided', { decision: input.decision, matched: !!data.matchId });
    },
  });
}

export function photoUrl(path: string): string {
  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
}
