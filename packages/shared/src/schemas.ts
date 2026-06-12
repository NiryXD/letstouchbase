import { z } from "zod";
import {
  DEGREE_LEVELS,
  DEPARTMENT_ARCHETYPES,
  INDUSTRIES,
  LIMITS,
  OPEN_TO_WORK,
  PHOTO_SLOTS,
  PIPELINE_STAGES,
} from "./taxonomies";

const currentYear = new Date().getFullYear();

export const experienceSchema = z.object({
  title: z.string().min(1).max(80),
  company: z.string().max(80).optional(),
  industry: z.enum(INDUSTRIES),
  startYear: z.number().int().min(1950).max(currentYear),
  endYear: z.number().int().min(1950).max(currentYear).nullable(), // null = Present
  oneLiner: z.string().max(LIMITS.experienceOneLinerMaxChars).optional(),
});
export type Experience = z.infer<typeof experienceSchema>;

export const educationSchema = z.object({
  school: z.string().min(1).max(100),
  degreeLevel: z.enum(DEGREE_LEVELS),
  field: z.string().max(80).optional(),
  classYear: z.number().int().min(1950).max(currentYear + 8),
});
export type Education = z.infer<typeof educationSchema>;

export const behavioralAnswerSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1).max(300),
});

export const profileSchema = z.object({
  headline: z.string().min(1).max(80),
  executiveSummary: z.string().max(500).optional(),
  currentTitle: z.string().max(80).optional(),
  employer: z.string().max(80).optional(),
  industry: z.enum(INDUSTRIES).optional(),
  openToWork: z.enum(OPEN_TO_WORK),
  archetype: z.enum(DEPARTMENT_ARCHETYPES).optional(),
  birthdate: z.string().date(),
  experience: z.array(experienceSchema).max(LIMITS.maxExperienceEntries),
  education: z.array(educationSchema).max(LIMITS.maxEducationEntries),
  behavioralAnswers: z.array(behavioralAnswerSchema).max(LIMITS.maxBehavioralAnswers),
});
export type Profile = z.infer<typeof profileSchema>;

/** A preference vector: a value plus whether it's a hard Dealbreaker ("Minimum Qualification"). */
const vector = <T extends z.ZodType>(value: T) =>
  z.object({ value, isDealbreaker: z.boolean().default(false) });

export const preferencesSchema = z.object({
  ageRange: vector(z.tuple([z.number().int().min(18), z.number().int().max(99)])),
  maxDistanceKm: z.number().int().min(2).max(300),
  genders: vector(z.array(z.string())),
  heightRangeCm: vector(z.tuple([z.number(), z.number()])).optional(),
  ethnicities: vector(z.array(z.string())).optional(),
  religions: vector(z.array(z.string())).optional(),
  familyPlans: vector(z.array(z.string())).optional(),
  industries: vector(z.array(z.enum(INDUSTRIES))).optional(),
  minDegreeLevel: vector(z.enum(DEGREE_LEVELS)).optional(),
  archetypes: vector(z.array(z.enum(DEPARTMENT_ARCHETYPES))).optional(),
  openToWork: vector(z.array(z.enum(OPEN_TO_WORK))).optional(),
});
export type Preferences = z.infer<typeof preferencesSchema>;

export const coverLetterSchema = z.object({
  toUserId: z.string().uuid(),
  /** What they screened on: a photo slot or a profile item id. */
  annotatedItem: z.object({
    kind: z.enum(["photo", "behavioral_answer", "experience", "education", "headline"]),
    id: z.string(),
  }),
  body: z.string().min(1).max(LIMITS.coverLetterMaxChars),
  isHeadhunt: z.boolean().default(false),
});
export type CoverLetter = z.infer<typeof coverLetterSchema>;

export const messageSchema = z.object({
  matchId: z.string().uuid(),
  body: z.string().min(1).max(2000),
});

export const pipelineStageSchema = z.enum(PIPELINE_STAGES);

const photoSlotKeys = PHOTO_SLOTS.map((s) => s.key) as [string, ...string[]];
export const photoSchema = z.object({
  slot: z.enum(photoSlotKeys),
  storagePath: z.string(),
  position: z.number().int().min(0).max(5),
});
