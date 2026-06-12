import { GENDERS, glossary, type Gender } from '@ltb/shared';
import { router } from 'expo-router';

import { Chips, Field, StepScreen } from '@/components/form';
import { useOnboarding } from '@/features/onboarding/store';

const GENDER_LABELS: Record<Gender, string> = {
  man: 'Men',
  woman: 'Women',
  nonbinary: 'Nonbinary people',
};

export default function CriteriaStep() {
  const { seeking, ageMin, ageMax, maxDistanceKm, set } = useOnboarding();

  const ageOk =
    /^\d+$/.test(ageMin) && /^\d+$/.test(ageMax) && +ageMin >= 18 && +ageMax >= +ageMin;
  const distOk = /^\d+$/.test(maxDistanceKm) && +maxDistanceKm >= 2;
  const valid = seeking.length > 0 && ageOk && distOk;

  return (
    <StepScreen
      title={glossary.filters.title}
      subtitle="Who should land on your desk? You can refine (and add dealbreakers) later."
      ctaLabel="Continue"
      ctaDisabled={!valid}
      onNext={() => router.push('/(onboarding)/review')}>
      <Chips
        label="Interested in"
        options={GENDERS}
        selected={seeking}
        onToggle={(v) =>
          set({ seeking: seeking.includes(v) ? seeking.filter((g) => g !== v) : [...seeking, v] })
        }
        display={(v) => GENDER_LABELS[v]}
      />
      <Field
        label="Age range — minimum"
        value={ageMin}
        onChangeText={(v) => set({ ageMin: v })}
        keyboardType="number-pad"
        maxLength={2}
      />
      <Field
        label="Age range — maximum"
        value={ageMax}
        onChangeText={(v) => set({ ageMax: v })}
        keyboardType="number-pad"
        maxLength={2}
      />
      <Field
        label="Max distance (km)"
        hint="Your commute tolerance."
        value={maxDistanceKm}
        onChangeText={(v) => set({ maxDistanceKm: v })}
        keyboardType="number-pad"
        maxLength={3}
      />
    </StepScreen>
  );
}
