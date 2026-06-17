// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (Phase 6) ───────
import { useAuth } from '@clerk/clerk-expo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from './supabase';

export type NotificationPrefs = {
  pushEnabled: boolean;
  screens: boolean;
  matches: boolean;
  messages: boolean;
  rejections: boolean;
  quietStart: number | null;
  quietEnd: number | null;
  tz: string | null;
};

const DEFAULTS: NotificationPrefs = {
  pushEnabled: true,
  screens: true,
  matches: true,
  messages: true,
  rejections: true,
  quietStart: null,
  quietEnd: null,
  tz: null,
};

export function useNotificationPrefs() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ['notification-prefs', userId],
    enabled: !!userId,
    queryFn: async (): Promise<NotificationPrefs> => {
      const { data, error } = await supabase
        .from('notification_prefs')
        .select('push_enabled, screens, matches, messages, rejections, quiet_start, quiet_end, tz')
        .eq('user_id', userId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULTS;
      return {
        pushEnabled: data.push_enabled,
        screens: data.screens,
        matches: data.matches,
        messages: data.messages,
        rejections: data.rejections,
        quietStart: data.quiet_start,
        quietEnd: data.quiet_end,
        tz: data.tz,
      };
    },
  });
}

/**
 * Upsert a partial change. Always stamps the device timezone so server-side
 * quiet-hours evaluation has an IANA zone to work with.
 */
export function useUpdateNotificationPrefs() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<NotificationPrefs>) => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const row: Record<string, unknown> = { user_id: userId!, tz, updated_at: new Date().toISOString() };
      if (patch.pushEnabled !== undefined) row.push_enabled = patch.pushEnabled;
      if (patch.screens !== undefined) row.screens = patch.screens;
      if (patch.matches !== undefined) row.matches = patch.matches;
      if (patch.messages !== undefined) row.messages = patch.messages;
      if (patch.rejections !== undefined) row.rejections = patch.rejections;
      if (patch.quietStart !== undefined) row.quiet_start = patch.quietStart;
      if (patch.quietEnd !== undefined) row.quiet_end = patch.quietEnd;
      const { error } = await supabase
        .from('notification_prefs')
        .upsert(row, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ['notification-prefs', userId] });
      const prev = queryClient.getQueryData<NotificationPrefs>(['notification-prefs', userId]);
      if (prev) {
        queryClient.setQueryData<NotificationPrefs>(['notification-prefs', userId], { ...prev, ...patch });
      }
      return { prev };
    },
    onError: (_e, _patch, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['notification-prefs', userId], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notification-prefs', userId] }),
  });
}
