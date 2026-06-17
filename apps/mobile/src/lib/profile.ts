import { useAuth } from '@clerk/clerk-expo';
import { useQuery } from '@tanstack/react-query';

import { supabase } from './supabase';

export type ProfileRow = {
  user_id: string;
  first_name: string;
  headline: string;
  executive_summary: string | null;
  current_title: string | null;
  employer: string | null;
  industry: string | null;
  archetype: string | null;
  open_to_work: 'committed' | 'casual' | 'networking';
  birthdate: string;
  gender: string;
  out_of_office: boolean;
  is_business_trip: boolean; // [Opus 4.8] Business Trip
  resume_pdf_path: string | null; // [Opus 4.8] Resume on File
};

/** The gate query: null = signed in but not onboarded yet. */
export function useMyProfile() {
  const { userId, isSignedIn } = useAuth();
  return useQuery({
    queryKey: ['my-profile', userId],
    enabled: !!isSignedIn && !!userId,
    queryFn: async (): Promise<ProfileRow | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'user_id, first_name, headline, executive_summary, current_title, employer, industry, archetype, open_to_work, birthdate, gender, out_of_office, is_business_trip, resume_pdf_path',
        )
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
