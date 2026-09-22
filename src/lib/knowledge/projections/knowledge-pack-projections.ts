import type {
  KnowledgePack,
  LessonPlannerPackProjection,
  QuizGeneratorPackProjection,
  TeacherReviewerPackProjection,
} from "@/types/knowledge-pack";

/**
 * Token-conscious projection for the (future) Quiz Generator Prompt
 * Builder: only the fields needed to plan and ground quiz questions.
 * Governance/version metadata, vocabulary, and lesson-planning fields are
 * deliberately excluded so they never inflate the compiled prompt.
 */
export function projectPackForQuizGenerator(pack: KnowledgePack): QuizGeneratorPackProjection {
  return {
    id: pack.id,
    topic: pack.topic,
    learningOutcomes: pack.learningOutcomes,
    assessableSkills: pack.assessableSkills,
    questionPatterns: pack.questionPatterns,
    difficultyRules: pack.difficultyRules,
    commonMisconceptions: pack.commonMisconceptions,
    forbiddenPatterns: pack.forbiddenPatterns,
  };
}

/**
 * Token-conscious projection for the (future) Lesson Planner Prompt
 * Builder: teaching guidance only. Question-design fields (`questionPatterns`,
 * `difficultyRules`) are irrelevant to lesson planning and excluded.
 */
export function projectPackForLessonPlanner(pack: KnowledgePack): LessonPlannerPackProjection {
  return {
    id: pack.id,
    topic: pack.topic,
    learningOutcomes: pack.learningOutcomes,
    prerequisiteKnowledge: pack.prerequisiteKnowledge,
    keyConcepts: pack.keyConcepts,
    teachingApproaches: pack.teachingApproaches,
    realWorldConnections: pack.realWorldConnections,
    differentiationNotes: pack.differentiationNotes,
    vocabulary: pack.vocabulary,
  };
}

/**
 * Projection for the future AI Teacher Reviewer: the fields needed to check
 * generated output against verified facts and governance rules, not to
 * generate new content.
 */
export function projectPackForTeacherReviewer(pack: KnowledgePack): TeacherReviewerPackProjection {
  return {
    id: pack.id,
    topic: pack.topic,
    learningOutcomes: pack.learningOutcomes,
    assessableSkills: pack.assessableSkills,
    commonMisconceptions: pack.commonMisconceptions,
    forbiddenPatterns: pack.forbiddenPatterns,
    criticalReviewRules: pack.criticalReviewRules,
    curriculumAlignment: pack.curriculumAlignment,
    vocabulary: pack.vocabulary,
  };
}
