import { GENDERS, type Gender } from '@ltb/shared';
import { router } from 'expo-router';

import { Chips, Field, StepScreen } from '@/components/form';
import { useOnboarding } from '@/features/onboarding/store';

function ageFrom(birthdate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) return null;
  const d = new Date(`${birthdate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

const GENDER_LABELS: Record<Gender, string> = {
  man: 'Man',
  woman: 'Woman',
  nonbinary: 'Nonbinary',
};

export default function BasicsStep() {
  const { firstName, birthdate, gender, set } = useOnboarding();
  const age = ageFrom(birthdate);
  const valid = firstName.trim().length > 0 && age !== null && age >= 18 && gender !== null;

  return (
    <StepScreen
      title="Personal Details"
      subtitle="The cover page of your resume. Legal name not required — this is HR-adjacent, not HR."
      ctaLabel="Continue"
      ctaDisabled={!valid}
      onNext={() => router.push('/(onboarding)/role')}>
      <Field
        label="First name"
        value={firstName}
        onChangeText={(v) => set({ firstName: v })}
        autoComplete="given-name"
      />
      <Field
        label="Date of birth"
        hint={
          age !== null && age < 18
            ? 'You must be 18+. Come back after graduation.'
            : 'YYYY-MM-DD. Must be 18+.'
        }
        placeholder="1999-04-12"
        value={birthdate}
        onChangeText={(v) => set({ birthdate: v })}
        keyboardType="numbers-and-punctuation"
      />
      <Chips
        label="Gender"
        options={GENDERS}
        selected={gender}
        onToggle={(v) => set({ gender: v })}
        display={(v) => GENDER_LABELS[v]}
      />
    </StepScreen>
  );
}
