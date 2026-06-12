import { useAuth } from '@clerk/clerk-expo';
import { glossary } from '@ltb/shared';
import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StepScreen } from '@/components/form';
import { useOnboarding } from '@/features/onboarding/store';
import { LTB } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function ReviewStep() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const draft = useOnboarding();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!userId || busy) return;
    setBusy(true);
    setError(null);
    try {
      // location is best-effort; the deck needs it eventually but onboarding shouldn't die on it
      let locationWkt: string | null = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          locationWkt = `POINT(${pos.coords.longitude} ${pos.coords.latitude})`;
        }
      } catch {
        // proceed without location
      }

      const { error: profileErr } = await supabase.from('profiles').insert({
        user_id: userId,
        first_name: draft.firstName.trim(),
        headline: draft.headline.trim(),
        executive_summary: draft.executiveSummary.trim() || null,
        current_title: draft.currentTitle.trim() || null,
        employer: draft.employer.trim() || null,
        industry: draft.industry,
        archetype: draft.archetype,
        open_to_work: draft.openToWork,
        birthdate: draft.birthdate,
        gender: draft.gender,
        location: locationWkt,
      });
      if (profileErr) throw profileErr;

      if (draft.education.length) {
        const { error: e } = await supabase.from('education').insert(
          draft.education.map((ed, i) => ({
            user_id: userId,
            school: ed.school,
            degree_level: ed.degreeLevel,
            field: ed.field ?? null,
            class_year: +ed.classYear,
            position: i,
          })),
        );
        if (e) throw e;
      }

      if (draft.experience.length) {
        const { error: e } = await supabase.from('experience').insert(
          draft.experience.map((ex, i) => ({
            user_id: userId,
            title: ex.title,
            company: ex.company ?? null,
            industry: ex.industry,
            start_year: +ex.startYear,
            end_year: ex.endYear ? +ex.endYear : null,
            one_liner: ex.oneLiner ?? null,
            position: i,
          })),
        );
        if (e) throw e;
      }

      const { error: answersErr } = await supabase.from('behavioral_answers').insert(
        draft.answers.map((a, i) => ({
          user_id: userId,
          question: a.question,
          answer: a.answer.trim(),
          position: i,
        })),
      );
      if (answersErr) throw answersErr;

      const photoRows = Object.entries(draft.photos).filter(([, p]) => !!p);
      const { error: photosErr } = await supabase.from('photos').insert(
        photoRows.map(([slot, storagePath], i) => ({
          user_id: userId,
          slot,
          storage_path: storagePath!,
          position: i,
        })),
      );
      if (photosErr) throw photosErr;

      const { error: prefsErr } = await supabase.from('preferences').insert({
        user_id: userId,
        age_min: +draft.ageMin,
        age_max: +draft.ageMax,
        max_distance_km: +draft.maxDistanceKm,
        genders: draft.seeking,
      });
      if (prefsErr) throw prefsErr;

      await queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      // gates take over: profile now exists → (onboarding) redirects to "/"
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? 'Submission failed.';
      setError(`${msg} — nothing lost; fix and resubmit.`);
      setBusy(false);
    }
  };

  return (
    <StepScreen
      title="Final Review"
      subtitle="HR will now process your application (instantly, we're efficient here)."
      ctaLabel="Submit Resume"
      busy={busy}
      onNext={submit}>
      <View style={styles.summary}>
        <Row label="Name" value={draft.firstName} />
        <Row label="Headline" value={draft.headline} />
        <Row label="Open to Work" value={glossary.openToWorkStatuses[draft.openToWork]} />
        <Row label="Education" value={`${draft.education.length} entries`} />
        <Row label="Experience" value={`${draft.experience.length} entries`} />
        <Row label="Behavioral answers" value={`${draft.answers.length}`} />
        <Row label="Photos" value={`${Object.keys(draft.photos).length} uploaded`} />
        <Row
          label="Seeking"
          value={`${draft.seeking.join(', ')} · ${draft.ageMin}–${draft.ageMax} · ${draft.maxDistanceKm}km`}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </StepScreen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: LTB.paper, borderRadius: 8, padding: 16, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { color: LTB.inkSecondary, fontSize: 13 },
  rowValue: { color: LTB.ink, fontWeight: '600', fontSize: 13, flexShrink: 1, textAlign: 'right' },
  error: { color: LTB.reject, marginTop: 12 },
});
