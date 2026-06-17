import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEGREE_LEVELS,
  DEGREE_RANK,
  DEPARTMENT_ARCHETYPES,
  ENDORSABLE_SKILLS,
  EXIT_OUTCOMES,
  FAMILY_PLANS,
  GENDERS,
  HAS_KIDS,
  INDUSTRIES,
  LIFESTYLE_FREQUENCY,
  OPEN_TO_WORK,
  PHOTO_SLOTS,
  PIPELINE_STAGES,
  POLITICS,
} from "./taxonomies";

const assertUnique = (name: string, values: readonly string[]) => {
  assert.equal(
    new Set(values).size,
    values.length,
    `${name} contains duplicate values`,
  );
};

test("taxonomy arrays contain no duplicates", () => {
  assertUnique("INDUSTRIES", INDUSTRIES);
  assertUnique("DEGREE_LEVELS", DEGREE_LEVELS);
  assertUnique("DEPARTMENT_ARCHETYPES", DEPARTMENT_ARCHETYPES);
  assertUnique("OPEN_TO_WORK", OPEN_TO_WORK);
  assertUnique("GENDERS", GENDERS);
  assertUnique("FAMILY_PLANS", FAMILY_PLANS);
  assertUnique("HAS_KIDS", HAS_KIDS);
  assertUnique("LIFESTYLE_FREQUENCY", LIFESTYLE_FREQUENCY);
  assertUnique("POLITICS", POLITICS);
  assertUnique("PIPELINE_STAGES", PIPELINE_STAGES);
  // [Opus 4.8] assertions below authored this session
  assertUnique("ENDORSABLE_SKILLS", ENDORSABLE_SKILLS);
  assertUnique("EXIT_OUTCOMES", EXIT_OUTCOMES);
});

test("DEGREE_RANK covers every degree level with a non-negative tier", () => {
  for (const level of DEGREE_LEVELS) {
    const rank = DEGREE_RANK[level];
    assert.ok(
      Number.isInteger(rank) && rank >= 0,
      `DEGREE_RANK missing or invalid for "${level}"`,
    );
  }
  // No stale entries for removed degree levels either.
  assert.equal(Object.keys(DEGREE_RANK).length, DEGREE_LEVELS.length);
});

test("PHOTO_SLOTS has unique keys and exactly one required slot (the headshot)", () => {
  assertUnique(
    "PHOTO_SLOTS keys",
    PHOTO_SLOTS.map((s) => s.key),
  );
  const required = PHOTO_SLOTS.filter((s) => s.required);
  assert.equal(required.length, 1);
  assert.equal(required[0]!.key, "headshot");
});

test("pipeline starts at sourced and ends at offer_extended", () => {
  assert.equal(PIPELINE_STAGES[0], "sourced");
  assert.equal(PIPELINE_STAGES[PIPELINE_STAGES.length - 1], "offer_extended");
});
