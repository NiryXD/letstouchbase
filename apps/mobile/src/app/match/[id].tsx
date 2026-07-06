import { useAuth } from '@clerk/clerk-expo';
import { glossary } from '@ltb/shared';
import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { LTB } from '@/constants/theme';
import { useProfileCard } from '@/lib/discovery';
// [Opus 4.8] Endorse + Exit Interview wiring authored this session
import { EndorseModal } from '@/features/match/EndorseModal';
import { ExitInterviewModal } from '@/features/match/ExitInterviewModal';
import {
  useBlockUser,
  useMessages,
  useReport,
  useRetractMessage,
  useSendMessage,
  useSubmitExitInterview,
  useTerminate,
} from '@/lib/matches';
import { getResumeSignedUrl } from '@/lib/resume'; // [Opus 4.8] Resume on File (match-gated)
import { supabase } from '@/lib/supabase';

export default function AlignmentCallScreen() {
  const { id, other } = useLocalSearchParams<{ id: string; other: string }>();
  const { userId } = useAuth();
  const { data: messages } = useMessages(id);
  const { data: otherCard } = useProfileCard(other);
  const send = useSendMessage(id);
  const retract = useRetractMessage(id);
  const terminate = useTerminate();
  const block = useBlockUser();
  const report = useReport();
  // [Opus 4.8] Exit Interview + Endorse state authored this session
  const submitExit = useSubmitExitInterview();
  const [draft, setDraft] = useState('');
  const [endorsing, setEndorsing] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  // when set, the Termination succeeded and we collect the Exit Interview
  const [exitForMatch, setExitForMatch] = useState<string | null>(null);

  // [Opus 4.8] Resume on File — the other party's path (file itself is RLS-gated)
  const { data: resumePath } = useQuery({
    queryKey: ['resume-path', other],
    enabled: !!other,
    queryFn: async (): Promise<string | null> => {
      const { data } = await supabase
        .from('profiles')
        .select('resume_pdf_path')
        .eq('user_id', other)
        .maybeSingle();
      return data?.resume_pdf_path ?? null;
    },
  });

  const onViewResume = async () => {
    if (!resumePath || resumeLoading) return;
    setResumeLoading(true);
    try {
      const url = await getResumeSignedUrl(resumePath);
      if (url) await WebBrowser.openBrowserAsync(url);
      else Alert.alert(glossary.profile.resumeOnFile, glossary.profile.resumeUnavailable);
    } finally {
      setResumeLoading(false);
    }
  };

  const onSend = () => {
    const body = draft.trim();
    if (!body || send.isPending) return;
    setDraft('');
    send.mutate(body);
  };

  const onLongPressOwn = (messageId: number) => {
    Alert.alert(glossary.actions.unsend, 'Retract this statement from the record?', [
      { text: 'Let it stand', style: 'cancel' },
      { text: 'Retract', style: 'destructive', onPress: () => retract.mutate(messageId) },
    ]);
  };

  const onTerminate = () => {
    Alert.alert(
      glossary.actions.unmatch,
      `End your engagement with ${otherCard?.firstName ?? 'this candidate'}? This closes the alignment call.`,
      [
        { text: 'Keep working together', style: 'cancel' },
        {
          text: 'Terminate',
          style: 'destructive',
          onPress: async () => {
            await terminate.mutateAsync(id);
            // surface the Exit Interview instead of leaving immediately
            setExitForMatch(id);
          },
        },
      ],
    );
  };

  // [Opus 4.8] Exit Interview submit/skip handlers authored this session
  const onSubmitExit = async (input: {
    met: boolean;
    outcome: 'great' | 'fine' | 'poor' | 'no_show';
    note: string;
  }) => {
    if (!exitForMatch) return;
    await submitExit.mutateAsync({ matchId: exitForMatch, ...input });
    setExitForMatch(null);
    router.back();
  };

  const onSkipExit = () => {
    setExitForMatch(null);
    router.back();
  };

  const onReportBlock = () => {
    Alert.alert('Report & Block', 'File a formal complaint with HR?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Violates dress code',
        onPress: async () => {
          report.mutate({ reported: other, reason: 'dress_code' });
          await block.mutateAsync(other);
          router.back();
        },
      },
      {
        text: 'Inappropriate conduct',
        style: 'destructive',
        onPress: async () => {
          report.mutate({ reported: other, reason: 'inappropriate' });
          await block.mutateAsync(other);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: otherCard ? `${glossary.match.chat}: ${otherCard.firstName}` : glossary.match.chat,
          headerStyle: { backgroundColor: LTB.paper },
          headerTintColor: LTB.navy,
          headerTitleStyle: { color: LTB.navy, fontWeight: '700' },
        }}
      />
      <View style={styles.actionsRow}>
        {/* [Opus 4.8] Endorse action authored this session */}
        <Pressable onPress={() => setEndorsing(true)}>
          <Text style={styles.actionPrimary}>{glossary.endorsements.cta}</Text>
        </Pressable>
        <Pressable onPress={onTerminate}>
          <Text style={styles.actionDanger}>{glossary.actions.unmatch}</Text>
        </Pressable>
        <Pressable onPress={onReportBlock}>
          <Text style={styles.actionDanger}>Report & Block</Text>
        </Pressable>
      </View>
      {/* [Opus 4.8] Resume on File — only matched users can open the signed URL */}
      {resumePath ? (
        <Pressable style={styles.resumeBar} onPress={onViewResume} disabled={resumeLoading}>
          {resumeLoading ? (
            <ActivityIndicator color={LTB.primary} />
          ) : (
            <Text style={styles.resumeBarText}>📄 {glossary.profile.resumeViewMatch}</Text>
          )}
        </Pressable>
      ) : null}
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={[...(messages ?? [])].reverse()}
        inverted
        keyExtractor={(m) => String(m.id)}
        renderItem={({ item }) => {
          const mine = item.sender === userId;
          return (
            <Pressable
              onLongPress={mine && !item.retracted ? () => onLongPressOwn(item.id) : undefined}
              style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={[styles.bubbleText, mine && styles.bubbleTextMine, item.retracted && styles.retracted]}>
                {item.retracted ? '— statement retracted —' : item.body}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              The floor is yours. Open with something better than "per my last email."
            </Text>
          </View>
        }
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type your talking points…"
            placeholderTextColor={LTB.inkSecondary}
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <Pressable style={[styles.sendBtn, !draft.trim() && styles.sendDisabled]} onPress={onSend}>
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* [Opus 4.8] Endorse + Exit Interview modals authored this session */}
      {endorsing && otherCard ? (
        <EndorseModal
          name={otherCard.firstName}
          targetUserId={other}
          onClose={() => setEndorsing(false)}
        />
      ) : null}
      {exitForMatch ? (
        <ExitInterviewModal
          name={otherCard?.firstName ?? 'this candidate'}
          submitting={submitExit.isPending}
          onSubmit={onSubmitExit}
          onSkip={onSkipExit}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LTB.feedGray },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: LTB.paper,
    borderBottomWidth: 1,
    borderBottomColor: LTB.divider,
  },
  actionDanger: { color: LTB.reject, fontSize: 12, fontWeight: '600' },
  actionPrimary: { color: LTB.primary, fontSize: 12, fontWeight: '700' }, // [Opus 4.8]
  // [Opus 4.8] Resume on File bar
  resumeBar: {
    backgroundColor: LTB.paper,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: LTB.divider,
    alignItems: 'center',
  },
  resumeBarText: { color: LTB.primary, fontWeight: '700', fontSize: 13 },
  list: { flex: 1 },
  listContent: { padding: 16, gap: 8 },
  bubble: { maxWidth: '80%', borderRadius: 10, padding: 12 },
  mine: { alignSelf: 'flex-end', backgroundColor: LTB.primary },
  theirs: { alignSelf: 'flex-start', backgroundColor: LTB.paper },
  bubbleText: { color: LTB.ink, lineHeight: 19 },
  bubbleTextMine: { color: LTB.paper },
  retracted: { fontStyle: 'italic', opacity: 0.7 },
  empty: { padding: 24, transform: [{ scaleY: -1 }] },
  emptyText: { color: LTB.inkSecondary, textAlign: 'center' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    backgroundColor: LTB.paper,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: LTB.divider,
    borderRadius: 8,
    padding: 10,
    maxHeight: 120,
    color: LTB.ink,
  },
  sendBtn: {
    backgroundColor: LTB.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: LTB.paper, fontWeight: '700' },
});
