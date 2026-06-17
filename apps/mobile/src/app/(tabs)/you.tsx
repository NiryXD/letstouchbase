import { useAuth, useClerk } from '@clerk/clerk-expo';
import { glossary } from '@ltb/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router'; // [Opus 4.8] Performance Review navigation
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { LTB } from '@/constants/theme';
import { ResumeCard } from '@/features/discovery/ResumeCard';
import { useProfileCard } from '@/lib/discovery';
import { useEntitlements } from '@/lib/entitlements'; // [Opus 4.8] Phase 5 billing
import { useMyProfile } from '@/lib/profile';
import { useRemoveResume, useUploadResume } from '@/lib/resume'; // [Opus 4.8] Resume on File
import {
  useCreateReferenceInvite,
  useDeleteReference,
  useMyReferences,
  useSetReferenceApproval,
} from '@/lib/references';
import { supabase } from '@/lib/supabase';

const OTW_COLORS = {
  committed: LTB.openToWork.committed,
  casual: LTB.openToWork.casual,
  networking: LTB.openToWork.networking,
} as const;

export default function YourResumeScreen() {
  const { signOut } = useClerk();
  const { userId } = useAuth();
  const { data: profile } = useMyProfile();
  const { data: card } = useProfileCard(userId ?? undefined);
  const { data: references } = useMyReferences();
  const { data: entitlements } = useEntitlements(); // [Opus 4.8] Phase 5 billing
  const createInvite = useCreateReferenceInvite();
  const setApproval = useSetReferenceApproval();
  const deleteReference = useDeleteReference();
  const uploadResume = useUploadResume(); // [Opus 4.8] Resume on File
  const removeResume = useRemoveResume();
  const queryClient = useQueryClient();

  const toggleOutOfOffice = async (value: boolean) => {
    await supabase.from('profiles').update({ out_of_office: value }).eq('user_id', userId!);
    queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    queryClient.invalidateQueries({ queryKey: ['profile-card', userId] });
  };

  const requestReference = async () => {
    try {
      const link = await createInvite.mutateAsync();
      await Share.share({
        message: `I'm listing you as a reference. Write me one (takes 2 minutes, expires in 14 days): ${link}`,
      });
    } catch {
      Alert.alert('Could not create the invite link. Try again.');
    }
  };

  // [Opus 4.8] confirmDeleteReference — authored by Claude Opus 4.8 this session
  const confirmDeleteReference = (id: number, authorName: string) => {
    Alert.alert(
      'Remove reference',
      `Permanently remove the reference from ${authorName}? This can’t be undone.`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteReference.mutate(id),
        },
      ],
    );
  };

  const tenderResignation = () => {
    Alert.alert(
      'Tender Your Resignation',
      'This permanently deletes your account: resume, photos, matches, alignment calls — everything. There is no rehire process.',
      [
        { text: 'Stay employed', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Final confirmation', 'Sign and submit your resignation?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Resign permanently',
                style: 'destructive',
                onPress: async () => {
                  const { error } = await supabase.functions.invoke('delete-account');
                  if (error) {
                    Alert.alert('Deletion failed', 'Please try again.');
                    return;
                  }
                  await signOut();
                },
              },
            ]),
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {profile ? (
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingMeta}>
              <Text style={styles.settingLabel}>{glossary.profile.outOfOffice}</Text>
              <Text style={styles.settingHint}>
                Auto-reply mode: you stay visible, expectations get managed.
              </Text>
            </View>
            <Switch
              value={profile.out_of_office}
              onValueChange={toggleOutOfOffice}
              trackColor={{ true: LTB.primary }}
            />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingMeta}>
              <Text style={styles.settingLabel}>{glossary.profile.openToWork}</Text>
            </View>
            <View
              style={[styles.otwBadge, { backgroundColor: OTW_COLORS[profile.open_to_work] }]}>
              <Text style={styles.otwText}>
                {glossary.openToWorkStatuses[profile.open_to_work]}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* [Opus 4.8] Hiring Criteria + Business Trip entries */}
      <Pressable style={styles.reviewBtn} onPress={() => router.push('/hiring-criteria')}>
        <View style={styles.reviewMeta}>
          <Text style={styles.reviewTitle}>{glossary.filters.title}</Text>
          <Text style={styles.reviewSub}>Edit your filters and Minimum Qualifications.</Text>
        </View>
        <Text style={styles.reviewChevron}>›</Text>
      </Pressable>

      <Pressable style={styles.reviewBtn} onPress={() => router.push('/business-trip')}>
        <View style={styles.reviewMeta}>
          <Text style={styles.reviewTitle}>{glossary.businessTrip.title}</Text>
          <Text style={styles.reviewSub}>
            {profile?.is_business_trip ? glossary.businessTrip.active : glossary.businessTrip.sub}
          </Text>
        </View>
        <Text style={styles.reviewChevron}>›</Text>
      </Pressable>

      {/* [Opus 4.8] Resume on File (PDF) */}
      <View style={styles.resumeCard}>
        <Text style={styles.resumeTitle}>{glossary.profile.resumeOnFile}</Text>
        <Text style={styles.resumeHint}>{glossary.profile.resumeUploadWarning}</Text>
        {profile?.resume_pdf_path ? (
          <>
            <Text style={styles.resumeSet}>✓ {glossary.profile.resumeOnFileSet}</Text>
            <View style={styles.resumeActions}>
              <Pressable
                style={styles.resumeReplaceBtn}
                disabled={uploadResume.isPending}
                onPress={() => uploadResume.mutate()}>
                <Text style={styles.resumeReplaceText}>{glossary.profile.resumeReplace}</Text>
              </Pressable>
              <Pressable
                style={styles.resumeRemoveBtn}
                disabled={removeResume.isPending}
                onPress={() => removeResume.mutate()}>
                <Text style={styles.resumeRemoveText}>{glossary.profile.resumeRemove}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable
            style={styles.resumeUploadBtn}
            disabled={uploadResume.isPending}
            onPress={() => uploadResume.mutate()}>
            <Text style={styles.resumeUploadText}>{glossary.profile.resumeUpload}</Text>
          </Pressable>
        )}
      </View>

      {/* [Opus 4.8] Notification settings entry (Phase 6) */}
      <Pressable style={styles.reviewBtn} onPress={() => router.push('/notifications')}>
        <View style={styles.reviewMeta}>
          <Text style={styles.reviewTitle}>{glossary.notifications.title}</Text>
          <Text style={styles.reviewSub}>Per-category opt-outs and quiet hours.</Text>
        </View>
        <Text style={styles.reviewChevron}>›</Text>
      </Pressable>

      {/* [Opus 4.8] Billing: Executive Suite + Discretionary Budget (Phase 5) */}
      <View style={styles.billingCard}>
        {entitlements?.isExecutive ? (
          <View style={styles.execActive}>
            <Text style={styles.execActiveText}>✓ {glossary.premium.activeBadge}</Text>
          </View>
        ) : (
          <Pressable style={styles.upgradeBtn} onPress={() => router.push('/paywall')}>
            <View style={styles.reviewMeta}>
              <Text style={styles.upgradeTitle}>{glossary.premium.paywallTitle}</Text>
              <Text style={styles.upgradeSub}>{glossary.premium.tierName} — volume & reach only.</Text>
            </View>
            <Text style={styles.upgradeChevron}>›</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.budgetRow}
          onPress={() => router.push('/discretionary-budget')}>
          <View style={styles.reviewMeta}>
            <Text style={styles.reviewTitle}>{glossary.premium.consumablesTitle}</Text>
            <Text style={styles.reviewSub}>
              {glossary.premium.headhuntCredits(entitlements?.headhuntCredits ?? 0)} ·{' '}
              {glossary.premium.boostCredits(entitlements?.boostCredits ?? 0)}
            </Text>
          </View>
          <Text style={styles.reviewChevron}>›</Text>
        </Pressable>
      </View>

      {/* [Opus 4.8] Quarterly Performance Review entry — authored this session */}
      <Pressable style={styles.reviewBtn} onPress={() => router.push('/performance-review')}>
        <View style={styles.reviewMeta}>
          <Text style={styles.reviewTitle}>{glossary.analytics.title}</Text>
          <Text style={styles.reviewSub}>Your funnel metrics, summarized for the board.</Text>
        </View>
        <Text style={styles.reviewChevron}>›</Text>
      </Pressable>

      {/* [Opus 4.8] References manager + Resignation button — authored this session */}
      <View style={styles.referencesCard}>
        <View style={styles.referencesHeader}>
          <Text style={styles.referencesTitle}>References on File</Text>
          <Pressable
            style={styles.requestBtn}
            disabled={createInvite.isPending}
            onPress={requestReference}>
            <Text style={styles.requestBtnText}>+ Request</Text>
          </Pressable>
        </View>
        <Text style={styles.referencesHint}>
          Approved references appear on your resume. Share the link with a colleague — they write
          one in two minutes, no account needed.
        </Text>
        {references?.length ? (
          references.map((r) => (
            <View key={r.id} style={styles.refRow}>
              <View style={styles.refMeta}>
                <Text style={styles.refBody} numberOfLines={3}>
                  &ldquo;{r.body}&rdquo;
                </Text>
                <Text style={styles.refAuthor}>
                  — {r.author_name}
                  {r.relationship ? `, ${r.relationship}` : ''}
                </Text>
              </View>
              <View style={styles.refControls}>
                <View style={styles.refApprove}>
                  <Text style={styles.refApproveLabel}>{r.is_approved ? 'Shown' : 'Hidden'}</Text>
                  <Switch
                    value={r.is_approved}
                    onValueChange={(approved) => setApproval.mutate({ id: r.id, approved })}
                    trackColor={{ true: LTB.primary }}
                  />
                </View>
                <Pressable onPress={() => confirmDeleteReference(r.id, r.author_name)}>
                  <Text style={styles.refDelete}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.refEmpty}>
            No references yet. Tap “Request” to get your first one — it’s the pre-launch growth hook
            and it makes the resume hit different.
          </Text>
        )}
      </View>

      {card ? (
        <>
          <Text style={styles.previewLabel}>
            Your resume, as candidates see it (tap targets disabled):
          </Text>
          <ResumeCard card={card} onAnnotate={() => {}} />
        </>
      ) : null}

      <Pressable style={styles.signOut} onPress={() => signOut()}>
        <Text style={styles.signOutText}>{glossary.auth.signOut}</Text>
      </Pressable>

      <Pressable style={styles.resign} onPress={tenderResignation}>
        <Text style={styles.resignText}>Tender Your Resignation</Text>
      </Pressable>
      <Text style={styles.resignHint}>
        Permanently deletes your account and all records. Required by the app stores, and the only
        honest way out.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14 },
  settingsCard: { backgroundColor: LTB.paper, borderRadius: 8, padding: 16, gap: 14 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingMeta: { flex: 1 },
  settingLabel: { color: LTB.ink, fontWeight: '600' },
  settingHint: { color: LTB.inkSecondary, fontSize: 12, marginTop: 2 },
  otwBadge: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  otwText: { color: LTB.paper, fontSize: 12, fontWeight: '600' },
  previewLabel: { color: LTB.inkSecondary, fontSize: 12 },
  // [Opus 4.8] Resume on File styles
  resumeCard: { backgroundColor: LTB.paper, borderRadius: 8, padding: 16, gap: 10 },
  resumeTitle: { color: LTB.navy, fontWeight: '700', fontSize: 15 },
  resumeHint: { color: LTB.inkSecondary, fontSize: 12, lineHeight: 17 },
  resumeSet: { color: LTB.openToWork.committed, fontSize: 13, fontWeight: '600' },
  resumeActions: { flexDirection: 'row', gap: 10 },
  resumeUploadBtn: { backgroundColor: LTB.primary, borderRadius: 6, padding: 12, alignItems: 'center' },
  resumeUploadText: { color: LTB.paper, fontWeight: '700' },
  resumeReplaceBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: LTB.primary,
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
  },
  resumeReplaceText: { color: LTB.primary, fontWeight: '600' },
  resumeRemoveBtn: {
    borderWidth: 1,
    borderColor: LTB.divider,
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  resumeRemoveText: { color: LTB.reject, fontWeight: '600' },
  // [Opus 4.8] billing card styles (Phase 5)
  billingCard: { backgroundColor: LTB.paper, borderRadius: 8, padding: 8, gap: 4 },
  execActive: {
    backgroundColor: LTB.openToWork.committed,
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
  },
  execActiveText: { color: LTB.paper, fontWeight: '700' },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LTB.primary,
    borderRadius: 6,
    padding: 14,
  },
  upgradeTitle: { color: LTB.paper, fontWeight: '700', fontSize: 15 },
  upgradeSub: { color: LTB.paper, fontSize: 12, marginTop: 2, opacity: 0.9 },
  upgradeChevron: { color: LTB.paper, fontSize: 26, fontWeight: '300' },
  budgetRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  // [Opus 4.8] performance review + reference manager + resignation styles authored this session
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LTB.paper,
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: LTB.primary,
  },
  reviewMeta: { flex: 1 },
  reviewTitle: { color: LTB.navy, fontWeight: '700', fontSize: 15 },
  reviewSub: { color: LTB.inkSecondary, fontSize: 12, marginTop: 2 },
  reviewChevron: { color: LTB.primary, fontSize: 28, fontWeight: '300' },
  referencesCard: { backgroundColor: LTB.paper, borderRadius: 8, padding: 16, gap: 12 },
  referencesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  referencesTitle: { color: LTB.navy, fontWeight: '700', fontSize: 15 },
  referencesHint: { color: LTB.inkSecondary, fontSize: 12, lineHeight: 17 },
  requestBtn: {
    backgroundColor: LTB.primary,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  requestBtnText: { color: LTB.paper, fontWeight: '700', fontSize: 12 },
  refRow: {
    borderTopWidth: 1,
    borderTopColor: LTB.divider,
    paddingTop: 12,
    gap: 8,
  },
  refMeta: { gap: 4 },
  refBody: { color: LTB.ink, fontStyle: 'italic', lineHeight: 20 },
  refAuthor: { color: LTB.inkSecondary, fontSize: 13 },
  refControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  refApprove: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refApproveLabel: { color: LTB.inkSecondary, fontSize: 12 },
  refDelete: { color: LTB.reject, fontSize: 12, fontWeight: '600' },
  refEmpty: { color: LTB.inkSecondary, fontSize: 13, lineHeight: 19 },
  signOut: {
    borderWidth: 1,
    borderColor: LTB.divider,
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    backgroundColor: LTB.paper,
  },
  signOutText: { color: LTB.reject, fontWeight: '600' },
  resign: {
    borderWidth: 1,
    borderColor: LTB.reject,
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    backgroundColor: LTB.paper,
  },
  resignText: { color: LTB.reject, fontWeight: '700' },
  resignHint: { color: LTB.inkSecondary, fontSize: 11, textAlign: 'center', lineHeight: 15 },
});
