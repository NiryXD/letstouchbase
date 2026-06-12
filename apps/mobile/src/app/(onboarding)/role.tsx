import {
  DEPARTMENT_ARCHETYPES,
  glossary,
  INDUSTRIES,
  OPEN_TO_WORK,
  type OpenToWork,
} from '@ltb/shared';
import { router } from 'expo-router';

import { Chips, Field, StepScreen } from '@/components/form';
import { useOnboarding } from '@/features/onboarding/store';

const OTW_LABELS: Record<OpenToWork, string> = {
  committed: glossary.openToWorkStatuses.committed,
  casual: glossary.openToWorkStatuses.casual,
  networking: glossary.openToWorkStatuses.networking,
};

export default function RoleStep() {
  const {
    headline,
    executiveSummary,
    currentTitle,
    employer,
    industry,
    archetype,
    openToWork,
    set,
  } = useOnboarding();

  return (
    <StepScreen
      title="Current Role"
      subtitle="What do you do, and what are you in the market for?"
      ctaLabel="Continue"
      ctaDisabled={headline.trim().length === 0}
      onNext={() => router.push('/(onboarding)/background')}>
      <Field
        label="Headline"
        hint="The line under your name. Make it count."
        placeholder="Senior Overthinker, Open to Synergies"
        value={headline}
        onChangeText={(v) => set({ headline: v })}
        maxLength={80}
      />
      <Field
        label={glossary.profile.bio}
        hint="Optional. 2–3 sentences of personal brand."
        value={executiveSummary}
        onChangeText={(v) => set({ executiveSummary: v })}
        multiline
        maxLength={500}
      />
      <Field
        label="Current title"
        placeholder="Project Manager"
        value={currentTitle}
        onChangeText={(v) => set({ currentTitle: v })}
        maxLength={80}
      />
      <Field
        label="Employer"
        hint='Optional — "prefer not to say" is just leaving it blank.'
        value={employer}
        onChangeText={(v) => set({ employer: v })}
        maxLength={80}
      />
      <Chips
        label="Industry"
        options={INDUSTRIES}
        selected={industry}
        onToggle={(v) => set({ industry: industry === v ? null : v })}
      />
      <Chips
        label="Department (optional, pick your archetype)"
        options={DEPARTMENT_ARCHETYPES}
        selected={archetype}
        onToggle={(v) => set({ archetype: archetype === v ? null : v })}
      />
      <Chips
        label={glossary.profile.openToWork}
        options={OPEN_TO_WORK}
        selected={openToWork}
        onToggle={(v) => set({ openToWork: v })}
        display={(v) => OTW_LABELS[v]}
      />
    </StepScreen>
  );
}
