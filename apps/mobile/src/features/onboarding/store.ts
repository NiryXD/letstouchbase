import type {
  DegreeLevel,
  DepartmentArchetype,
  Gender,
  Industry,
  OpenToWork,
} from '@ltb/shared';
import { create } from 'zustand';

export type DraftEducation = {
  school: string;
  degreeLevel: DegreeLevel;
  field?: string;
  classYear: string; // text input; validated on submit
};

export type DraftExperience = {
  title: string;
  company?: string;
  industry: Industry;
  startYear: string;
  endYear: string; // '' = Present
  oneLiner?: string;
};

export type DraftAnswer = { question: string; answer: string };

/** storage paths keyed by slot; uploaded as soon as the user picks each photo */
export type DraftPhotos = Partial<Record<string, string>>;

type OnboardingDraft = {
  firstName: string;
  birthdate: string; // YYYY-MM-DD
  gender: Gender | null;
  headline: string;
  executiveSummary: string;
  currentTitle: string;
  employer: string;
  industry: Industry | null;
  archetype: DepartmentArchetype | null;
  openToWork: OpenToWork;
  education: DraftEducation[];
  experience: DraftExperience[];
  answers: DraftAnswer[];
  photos: DraftPhotos;
  // hiring criteria (preferences)
  seeking: Gender[];
  ageMin: string;
  ageMax: string;
  maxDistanceKm: string;
  set: (patch: Partial<OnboardingDraft>) => void;
  reset: () => void;
};

const initial = {
  firstName: '',
  birthdate: '',
  gender: null,
  headline: '',
  executiveSummary: '',
  currentTitle: '',
  employer: '',
  industry: null,
  archetype: null,
  openToWork: 'committed' as OpenToWork,
  education: [],
  experience: [],
  answers: [],
  photos: {},
  seeking: [],
  ageMin: '21',
  ageMax: '45',
  maxDistanceKm: '50',
};

export const useOnboarding = create<OnboardingDraft>((set) => ({
  ...initial,
  set: (patch) => set(patch),
  reset: () => set(initial),
}));
