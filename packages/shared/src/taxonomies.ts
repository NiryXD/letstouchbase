/**
 * Fixed taxonomies — single source of truth for profile pickers, filters,
 * and analytics. Stored in the DB as the string values below.
 */

export const INDUSTRIES = [
  "Tech",
  "Finance",
  "Engineering",
  "Manufacturing",
  "Retail",
  "Healthcare / Medicine",
  "Academia / Research",
  "Law",
  "Education",
  "Government",
  "Marketing / Media",
  "Consulting",
  "Real Estate",
  "Construction / Trades",
  "Hospitality",
  "Arts / Entertainment",
  "Nonprofit",
  "Science",
  "Military",
  "Student",
  "Other",
] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const DEGREE_LEVELS = [
  "High School",
  "Associate",
  "Bachelor's",
  "Master's",
  "PhD",
  "MD",
  "JD",
  "MBA",
  "Trade Certification",
  "Self-Taught",
] as const;
export type DegreeLevel = (typeof DEGREE_LEVELS)[number];

/** Ordering for "Bachelor's or higher" style filters. Non-ranked entries share a tier. */
export const DEGREE_RANK: Record<DegreeLevel, number> = {
  "High School": 0,
  "Self-Taught": 0,
  "Trade Certification": 1,
  Associate: 1,
  "Bachelor's": 2,
  "Master's": 3,
  MBA: 3,
  JD: 4,
  MD: 4,
  PhD: 4,
};

export const PHOTO_SLOTS = [
  { key: "headshot", label: "Professional Headshot", required: true },
  { key: "business_casual", label: "Business Casual", required: false },
  { key: "at_the_office", label: "At the Office / In the Field", required: false },
  { key: "casual_friday", label: "Casual Friday", required: false },
] as const;
export type PhotoSlot = (typeof PHOTO_SLOTS)[number]["key"];

export const DEPARTMENT_ARCHETYPES = [
  "Finance Bro",
  "Tech Bro",
  "Neuroscience Girlie",
  "Consultant (Will Explain Your Own Job To You)",
  "Founder Era",
  "Med Student (Unavailable Until 2031)",
  "Gym Is My Second Office",
  "Chronically On Email",
  "Lab Rat (Affectionate)",
  "Spreadsheet Romantic",
  "Recovering Academic",
  "Government Cheese",
] as const;
export type DepartmentArchetype = (typeof DEPARTMENT_ARCHETYPES)[number];

export const OPEN_TO_WORK = ["committed", "casual", "networking"] as const;
export type OpenToWork = (typeof OPEN_TO_WORK)[number];

export const GENDERS = ["man", "woman", "nonbinary"] as const;
export type Gender = (typeof GENDERS)[number];

export const FAMILY_PLANS = [
  "wants_kids",
  "open_to_kids",
  "does_not_want_kids",
  "not_sure",
] as const;
export type FamilyPlan = (typeof FAMILY_PLANS)[number];

export const HAS_KIDS = ["no_kids", "has_kids"] as const;
export type HasKids = (typeof HAS_KIDS)[number];

/** Shared scale for smoking / drinking / cannabis. */
export const LIFESTYLE_FREQUENCY = ["yes", "sometimes", "no"] as const;
export type LifestyleFrequency = (typeof LIFESTYLE_FREQUENCY)[number];

export const POLITICS = [
  "liberal",
  "moderate",
  "conservative",
  "apolitical",
  "other",
] as const;
export type Politics = (typeof POLITICS)[number];

export const BEHAVIORAL_QUESTIONS = [
  "Tell me about a time you went above and beyond on a date.",
  "What is your greatest weakness?",
  "Where do you see yourself in five years?",
  "Why should we hire you?",
  "Walk me through your dating resume.",
  "Describe a conflict and how you resolved it.",
  "What are your salary expectations?",
  "Do you have any questions for us?",
  "My toxic trait is checking Slack on vacation. Yours?",
  "My 5am morning routine includes…",
  "Describe your ideal off-site.",
  "What does work-life balance mean to you, romantically?",
] as const;

// [Opus 4.8] ENDORSABLE_SKILLS + EXIT_OUTCOMES — authored this session
/**
 * Endorsable "core competencies" — the satirical skill set colleagues can
 * vouch for. Fixed list so endorsement counts aggregate cleanly (no free text
 * to fragment the tallies) and the joke stays curated. Stored as the string
 * values below in `endorsements.skill`.
 */
export const ENDORSABLE_SKILLS = [
  "Synergy",
  "Stakeholder Management",
  "Responds to Texts Within One Business Day",
  "Conflict Resolution",
  "Emotional Availability (Q4)",
  "Active Listening",
  "Work-Life Balance",
  "Punctuality",
  "Cross-Functional Flirting",
  "Manages Up",
  "Low Maintenance, High Output",
  "Strategic Vision",
] as const;
export type EndorsableSkill = (typeof ENDORSABLE_SKILLS)[number];

/** Exit Interview — "We Met" feedback loop. Did the alignment call convert? */
export const EXIT_OUTCOMES = ["great", "fine", "poor", "no_show"] as const;
export type ExitOutcome = (typeof EXIT_OUTCOMES)[number];

export const PIPELINE_STAGES = [
  "sourced",
  "initial_screen",
  "second_round",
  "final_round",
  "offer_extended",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/** Business rules that must match the server-side Edge Functions. */
export const LIMITS = {
  freeScreensPerDay: 8,
  maxExperienceEntries: 3,
  maxEducationEntries: 2,
  maxBehavioralAnswers: 3,
  experienceOneLinerMaxChars: 100,
  coverLetterMaxChars: 280,
  rejectRecycleDays: 30,
  newHireBoostDays: 7,
} as const;
