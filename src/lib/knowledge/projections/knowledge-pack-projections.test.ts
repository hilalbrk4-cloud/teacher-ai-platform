import { describe, expect, it } from "vitest";
import { parseKnowledgePack } from "@/lib/knowledge/schema/knowledge-pack-schema";
import {
  projectPackForLessonPlanner,
  projectPackForQuizGenerator,
  projectPackForTeacherReviewer,
} from "@/lib/knowledge/projections/knowledge-pack-projections";
import validActivePack from "@/lib/knowledge/__fixtures__/valid-active-pack.json";

function parseOrThrow(raw: unknown) {
  const result = parseKnowledgePack(raw);
  if (!result.success) throw new Error("Fixture expected to parse structurally");
  return result.data;
}

describe("feature projections", () => {
  const pack = parseOrThrow(validActivePack);

  it("projects only quiz-relevant fields for the Quiz Generator", () => {
    const projection = projectPackForQuizGenerator(pack);
    expect(projection).toEqual({
      id: pack.id,
      topic: pack.topic,
      learningOutcomes: pack.learningOutcomes,
      assessableSkills: pack.assessableSkills,
      questionPatterns: pack.questionPatterns,
      difficultyRules: pack.difficultyRules,
      commonMisconceptions: pack.commonMisconceptions,
      forbiddenPatterns: pack.forbiddenPatterns,
    });
    expect(projection).not.toHaveProperty("sources");
    expect(projection).not.toHaveProperty("changelog");
    expect(projection).not.toHaveProperty("criticalReviewRules");
  });

  it("projects only lesson-planning fields for the Lesson Planner, excluding question-design fields", () => {
    const projection = projectPackForLessonPlanner(pack);
    expect(projection).toEqual({
      id: pack.id,
      topic: pack.topic,
      learningOutcomes: pack.learningOutcomes,
      prerequisiteKnowledge: pack.prerequisiteKnowledge,
      keyConcepts: pack.keyConcepts,
      teachingApproaches: pack.teachingApproaches,
      realWorldConnections: pack.realWorldConnections,
      differentiationNotes: pack.differentiationNotes,
      vocabulary: pack.vocabulary,
    });
    expect(projection).not.toHaveProperty("questionPatterns");
    expect(projection).not.toHaveProperty("difficultyRules");
    expect(projection).not.toHaveProperty("sources");
  });

  it("projects governance/verification fields for the Teacher Reviewer", () => {
    const projection = projectPackForTeacherReviewer(pack);
    expect(projection).toEqual({
      id: pack.id,
      topic: pack.topic,
      learningOutcomes: pack.learningOutcomes,
      assessableSkills: pack.assessableSkills,
      commonMisconceptions: pack.commonMisconceptions,
      forbiddenPatterns: pack.forbiddenPatterns,
      criticalReviewRules: pack.criticalReviewRules,
      curriculumAlignment: pack.curriculumAlignment,
      vocabulary: pack.vocabulary,
    });
    expect(projection).not.toHaveProperty("sources");
    expect(projection).not.toHaveProperty("changelog");
  });
});
