import {
  DEGREE_LEVELS,
  INDUSTRIES,
  LIMITS,
  type DegreeLevel,
  type Industry,
} from '@ltb/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chips, Field, StepScreen } from '@/components/form';
import { useOnboarding, type DraftEducation, type DraftExperience } from '@/features/onboarding/store';
import { LTB } from '@/constants/theme';

export default function BackgroundStep() {
  const { education, experience, set } = useOnboarding();

  // entry-in-progress local state
  const [school, setSchool] = useState('');
  const [degreeLevel, setDegreeLevel] = useState<DegreeLevel | null>(null);
  const [field, setField] = useState('');
  const [classYear, setClassYear] = useState('');

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobIndustry, setJobIndustry] = useState<Industry | null>(null);
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [oneLiner, setOneLiner] = useState('');

  const addEducation = () => {
    if (!school.trim() || !degreeLevel || !/^\d{4}$/.test(classYear)) return;
    const entry: DraftEducation = { school: school.trim(), degreeLevel, field: field.trim() || undefined, classYear };
    set({ education: [...education, entry] });
    setSchool('');
    setDegreeLevel(null);
    setField('');
    setClassYear('');
  };

  const addExperience = () => {
    if (!title.trim() || !jobIndustry || !/^\d{4}$/.test(startYear)) return;
    const entry: DraftExperience = {
      title: title.trim(),
      company: company.trim() || undefined,
      industry: jobIndustry,
      startYear,
      endYear: /^\d{4}$/.test(endYear) ? endYear : '',
      oneLiner: oneLiner.trim() || undefined,
    };
    set({ experience: [...experience, entry] });
    setTitle('');
    setCompany('');
    setJobIndustry(null);
    setStartYear('');
    setEndYear('');
    setOneLiner('');
  };

  return (
    <StepScreen
      title="Background"
      subtitle="Education and career history. Real credentials — this is the whole point."
      ctaLabel="Continue"
      onNext={() => router.push('/(onboarding)/questions')}>
      <Text style={styles.section}>Education ({education.length}/{LIMITS.maxEducationEntries})</Text>
      {education.map((e, i) => (
        <View key={i} style={styles.entry}>
          <Text style={styles.entryTitle}>
            {e.degreeLevel}
            {e.field ? `, ${e.field}` : ''} — {e.school}
          </Text>
          <Pressable onPress={() => set({ education: education.filter((_, j) => j !== i) })}>
            <Text style={styles.remove}>Remove</Text>
          </Pressable>
        </View>
      ))}
      {education.length < LIMITS.maxEducationEntries ? (
        <>
          <Field label="School" value={school} onChangeText={setSchool} />
          <Chips
            label="Degree"
            options={DEGREE_LEVELS}
            selected={degreeLevel}
            onToggle={(v) => setDegreeLevel(degreeLevel === v ? null : v)}
          />
          <Field label="Field of study (optional)" value={field} onChangeText={setField} />
          <Field
            label="Class year"
            placeholder="2023"
            value={classYear}
            onChangeText={setClassYear}
            keyboardType="number-pad"
            maxLength={4}
          />
          <Pressable style={styles.add} onPress={addEducation}>
            <Text style={styles.addText}>+ Add education</Text>
          </Pressable>
        </>
      ) : null}

      <Text style={styles.section}>Experience ({experience.length}/{LIMITS.maxExperienceEntries})</Text>
      {experience.map((e, i) => (
        <View key={i} style={styles.entry}>
          <Text style={styles.entryTitle}>
            {e.title}
            {e.company ? ` @ ${e.company}` : ''} ({e.startYear}–{e.endYear || 'Present'})
          </Text>
          <Pressable onPress={() => set({ experience: experience.filter((_, j) => j !== i) })}>
            <Text style={styles.remove}>Remove</Text>
          </Pressable>
        </View>
      ))}
      {experience.length < LIMITS.maxExperienceEntries ? (
        <>
          <Field label="Title" value={title} onChangeText={setTitle} />
          <Field label="Company (optional)" value={company} onChangeText={setCompany} />
          <Chips
            label="Industry"
            options={INDUSTRIES}
            selected={jobIndustry}
            onToggle={(v) => setJobIndustry(jobIndustry === v ? null : v)}
          />
          <Field
            label="Start year"
            placeholder="2021"
            value={startYear}
            onChangeText={setStartYear}
            keyboardType="number-pad"
            maxLength={4}
          />
          <Field
            label="End year (blank = Present)"
            value={endYear}
            onChangeText={setEndYear}
            keyboardType="number-pad"
            maxLength={4}
          />
          <Field
            label="One-liner (optional)"
            hint="100 characters of bragging."
            value={oneLiner}
            onChangeText={setOneLiner}
            maxLength={LIMITS.experienceOneLinerMaxChars}
          />
          <Pressable style={styles.add} onPress={addExperience}>
            <Text style={styles.addText}>+ Add experience</Text>
          </Pressable>
        </>
      ) : null}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  section: { color: LTB.navy, fontWeight: '700', fontSize: 16, marginTop: 12, marginBottom: 8 },
  entry: {
    backgroundColor: LTB.paper,
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  entryTitle: { color: LTB.ink, flex: 1 },
  remove: { color: LTB.reject, fontSize: 13 },
  add: {
    borderWidth: 1,
    borderColor: LTB.primary,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  addText: { color: LTB.primary, fontWeight: '600' },
});
