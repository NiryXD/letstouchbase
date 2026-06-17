// ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (Hiring Criteria) ─
import {
  DEPARTMENT_ARCHETYPES,
  GENDERS,
  glossary,
  INDUSTRIES,
  OPEN_TO_WORK,
  type Gender,
  type OpenToWork,
} from '@ltb/shared';
import { Stack } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Chips, Field } from '@/components/form';
import { LTB } from '@/constants/theme';
import { usePreferences, useUpdatePreferences, type Preferences } from '@/lib/preferences';

const F = glossary.filters;

const GENDER_LABELS: Record<Gender, string> = {
  man: 'Men',
  woman: 'Women',
  nonbinary: 'Nonbinary people',
};

// Minimum-education choices → min_degree_rank (mirrors DEGREE_RANK in shared).
const DEGREE_OPTIONS: { label: string; rank: number | null }[] = [
  { label: F.anyDegree, rank: null },
  { label: "Bachelor's+", rank: 2 },
  { label: "Master's+", rank: 3 },
  { label: 'Doctorate (PhD/MD/JD)', rank: 4 },
];

function Dealbreaker({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.dbRow}>
      <Text style={styles.dbLabel}>{F.dealbreakerHint}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: LTB.reject }} />
    </View>
  );
}

export default function HiringCriteriaScreen() {
  const { data: prefs } = usePreferences();
  const update = useUpdatePreferences();

  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: F.title,
        headerStyle: { backgroundColor: LTB.paper },
        headerTintColor: LTB.navy,
        headerTitleStyle: { color: LTB.navy, fontWeight: '700' },
      }}
    />
  );

  if (!prefs) {
    return (
      <View style={styles.center}>
        {header}
        <ActivityIndicator color={LTB.primary} size="large" />
      </View>
    );
  }

  const set = (patch: Partial<Preferences>) => update.mutate(patch);
  const toggleIn = <T extends string>(list: T[], v: T): T[] =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {header}
      <Text style={styles.sub}>{F.sub}</Text>

      <Text style={styles.section}>{F.standardTitle}</Text>
      <View style={styles.card}>
        <Chips
          label={F.seeking}
          options={GENDERS}
          selected={prefs.genders as Gender[]}
          onToggle={(v) => set({ genders: toggleIn(prefs.genders, v) })}
          display={(v) => GENDER_LABELS[v]}
        />
        <Dealbreaker value={prefs.gendersDb} onChange={(v) => set({ gendersDb: v })} />

        <View style={styles.ageRow}>
          <View style={styles.ageField}>
            <Field
              label={`${F.ageRange} — min`}
              value={String(prefs.ageMin)}
              keyboardType="number-pad"
              maxLength={2}
              onChangeText={(t) => set({ ageMin: Math.max(18, +t || 18) })}
            />
          </View>
          <View style={styles.ageField}>
            <Field
              label="max"
              value={String(prefs.ageMax)}
              keyboardType="number-pad"
              maxLength={2}
              onChangeText={(t) => set({ ageMax: Math.max(prefs.ageMin, +t || prefs.ageMin) })}
            />
          </View>
        </View>
        <Dealbreaker value={prefs.ageDb} onChange={(v) => set({ ageDb: v })} />

        <Field
          label={F.distance}
          value={String(prefs.maxDistanceKm)}
          keyboardType="number-pad"
          maxLength={3}
          onChangeText={(t) => set({ maxDistanceKm: Math.max(2, +t || 2) })}
        />
      </View>

      <Text style={styles.section}>{F.corporateTitle}</Text>
      <View style={styles.card}>
        <Chips
          label={F.industries}
          options={INDUSTRIES}
          selected={prefs.industries}
          onToggle={(v) => set({ industries: toggleIn(prefs.industries, v) })}
        />
        <Dealbreaker value={prefs.industriesDb} onChange={(v) => set({ industriesDb: v })} />

        <Text style={styles.fieldLabel}>{F.education}</Text>
        <View style={styles.chipWrap}>
          {DEGREE_OPTIONS.map((opt) => {
            const on = prefs.minDegreeRank === opt.rank;
            return (
              <Pressable
                key={opt.label}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => set({ minDegreeRank: opt.rank })}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Dealbreaker value={prefs.degreeDb} onChange={(v) => set({ degreeDb: v })} />

        <Chips
          label={F.archetypes}
          options={DEPARTMENT_ARCHETYPES}
          selected={prefs.archetypes}
          onToggle={(v) => set({ archetypes: toggleIn(prefs.archetypes, v) })}
        />
        <Dealbreaker value={prefs.archetypesDb} onChange={(v) => set({ archetypesDb: v })} />

        <Chips
          label={F.openToWork}
          options={OPEN_TO_WORK}
          selected={prefs.openToWork as OpenToWork[]}
          onToggle={(v) => set({ openToWork: toggleIn(prefs.openToWork, v) })}
          display={(v) => glossary.openToWorkStatuses[v]}
        />
        <Dealbreaker value={prefs.openToWorkDb} onChange={(v) => set({ openToWorkDb: v })} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LTB.feedGray },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: LTB.feedGray },
  content: { padding: 16, gap: 8 },
  sub: { color: LTB.inkSecondary, lineHeight: 19 },
  section: { color: LTB.inkSecondary, fontSize: 12, fontWeight: '700', marginTop: 10, marginLeft: 4 },
  card: { backgroundColor: LTB.paper, borderRadius: 8, padding: 16 },
  ageRow: { flexDirection: 'row', gap: 12 },
  ageField: { flex: 1 },
  dbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: LTB.divider,
    paddingTop: 8,
    marginBottom: 14,
  },
  dbLabel: { color: LTB.reject, fontSize: 12, fontWeight: '600' },
  fieldLabel: { color: LTB.ink, fontWeight: '600', fontSize: 13, marginBottom: 6 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    borderWidth: 1,
    borderColor: LTB.divider,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: LTB.paper,
  },
  chipOn: { backgroundColor: LTB.primary, borderColor: LTB.primary },
  chipText: { color: LTB.ink, fontSize: 13 },
  chipTextOn: { color: LTB.paper, fontWeight: '600' },
});
