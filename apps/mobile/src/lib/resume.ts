// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (Resume on File) ─
import { useAuth } from '@clerk/clerk-expo';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';

import { supabase } from './supabase';

/**
 * "Resume on File" — the real resume PDF. Stored in the private `resumes`
 * bucket at `{uid}/resume.pdf`; only matched users can mint a signed URL
 * (storage policy `resumes_matched_read`). The path lives on
 * `profiles.resume_pdf_path`.
 */
const RESUME_PATH = (userId: string) => `${userId}/resume.pdf`;

export function useUploadResume() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<boolean> => {
      const picked = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets[0]) return false;
      const file = await fetch(picked.assets[0].uri);
      const body = await file.arrayBuffer();
      const path = RESUME_PATH(userId!);
      const { error: upErr } = await supabase.storage
        .from('resumes')
        .upload(path, body, { contentType: 'application/pdf', upsert: true });
      if (upErr) throw upErr;
      const { error } = await supabase
        .from('profiles')
        .update({ resume_pdf_path: path })
        .eq('user_id', userId!);
      if (error) throw error;
      return true;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-profile'] }),
  });
}

export function useRemoveResume() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const path = RESUME_PATH(userId!);
      await supabase.storage.from('resumes').remove([path]);
      const { error } = await supabase
        .from('profiles')
        .update({ resume_pdf_path: null })
        .eq('user_id', userId!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-profile'] }),
  });
}

/**
 * Signed URL for a matched candidate's resume. Storage RLS gates this: it only
 * succeeds if `ltb_is_matched(me, ownerUid)` is true — returns null otherwise.
 */
export async function getResumeSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('resumes').createSignedUrl(path, 60);
  if (error || !data) return null;
  return data.signedUrl;
}
