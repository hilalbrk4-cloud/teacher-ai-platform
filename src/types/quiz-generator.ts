export const QUIZ_TYPES = [
  "classroomQuiz",
  "worksheetQuiz",
  "exitTicket",
  "practiceQuiz",
  "homeworkQuiz",
  "unitAssessment",
  "mixedAssessment",
] as const;

export type QuizType = (typeof QUIZ_TYPES)[number];

export const QUESTION_TYPES = [
  "multipleChoice",
  "trueFalse",
  "shortAnswer",
  "fillInBlank",
  "matching",
  "ordering",
  "openEnded",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_APPROACHES = [
  "quickReview",
  "learningCheck",
  "competencyBased",
  "newGeneration",
  "realLifeContext",
  "problemSolving",
  "experimentInterpretation",
  "graphInterpretation",
  "mixed",
] as const;

export type QuestionApproach = (typeof QUESTION_APPROACHES)[number];

export const COGNITIVE_LEVELS = ["remember", "understand", "apply", "analyze", "evaluate"] as const;

export type CognitiveLevel = (typeof COGNITIVE_LEVELS)[number];

export const DIFFICULTY_LEVELS = ["easy", "medium", "hard"] as const;

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const VISUAL_USAGE_OPTIONS = ["none", "whenAppropriate", "visualHeavy"] as const;

export type VisualUsage = (typeof VISUAL_USAGE_OPTIONS)[number];

export const VISUAL_TYPES = [
  "graph",
  "table",
  "numberLine",
  "fractionModel",
  "geometryDiagram",
  "coordinatePlane",
  "scientificDiagram",
  "experimentSetup",
  "flowChart",
  "lifeCycleDiagram",
  "foodChain",
  "measurementTool",
  "customSvg",
] as const;

export type VisualType = (typeof VISUAL_TYPES)[number];

/** A slot may also have no visual allocated at all. */
export type SlotVisualType = VisualType | "none";

export type QuizRequiredField = "subject" | "gradeLevel" | "topic" | "objectives" | "questionCount";

export type QuizFormErrors = Partial<Record<QuizRequiredField, string>>;

/**
 * Raw teacher input from the Quiz Generator form. This is never sent
 * directly to the Prompt Builder — it first goes through
 * `buildQuizBlueprint` (see `quiz-blueprint.ts`), which is the only
 * consumer of this type on the generation path.
 */
export interface QuizFormInput {
  quizType: QuizType;
  subject: string;
  gradeLevel: string;
  topic: string;
  objectives: string;
  questionCount: number;
  questionTypes: QuestionType[];
  questionApproach: QuestionApproach;
  cognitiveLevel: CognitiveLevel;
  difficulty: DifficultyLevel | "mixed";
  visualUsage: VisualUsage;
  visualTypes: VisualType[];
  includeAnswerKey: boolean;
  includeExplanations: boolean;
}

/** Structured, per-type visual payload. Rendered client-side; never raw SVG/HTML/markdown. */
export interface QuizVisual {
  type: VisualType;
  title?: string;
  data: Record<string, unknown>;
  altText: string;
}

/**
 * Internal, UI-hidden metadata attached to every generated question by the
 * validator, copied from the `QuestionBlueprintSlot` the question fulfills
 * — never parsed from or trusted from the AI response. Kept for future AI
 * features (outcome coverage, adaptive difficulty, AI Improve actions).
 */
export interface QuestionAudit {
  learningOutcome: string;
  cognitiveLevel: CognitiveLevel;
  difficulty: DifficultyLevel;
  approach: QuestionApproach;
  visualType: SlotVisualType;
}

interface QuizQuestionBase {
  id: string;
  type: QuestionType;
  prompt: string;
  visual?: QuizVisual;
  points?: number;
  answerExplanation?: string;
  audit: QuestionAudit;
}

export interface MultipleChoiceQuestion extends QuizQuestionBase {
  type: "multipleChoice";
  options: { id: string; text: string }[];
  correctOptionId: string;
}

export interface TrueFalseQuestion extends QuizQuestionBase {
  type: "trueFalse";
  correctAnswer: boolean;
}

export interface ShortAnswerQuestion extends QuizQuestionBase {
  type: "shortAnswer";
  acceptableAnswers: string[];
}

export interface FillInBlankQuestion extends QuizQuestionBase {
  type: "fillInBlank";
  textWithBlanks: string;
  blanks: { index: number; acceptableAnswers: string[] }[];
}

export interface MatchingQuestion extends QuizQuestionBase {
  type: "matching";
  leftItems: { id: string; text: string }[];
  rightItems: { id: string; text: string }[];
  correctPairs: { leftId: string; rightId: string }[];
}

export interface OrderingQuestion extends QuizQuestionBase {
  type: "ordering";
  items: { id: string; text: string }[];
  correctOrder: string[];
}

export interface OpenEndedQuestion extends QuizQuestionBase {
  type: "openEnded";
  sampleAnswer: string;
  gradingCriteria?: string[];
}

export type QuizQuestion =
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | ShortAnswerQuestion
  | FillInBlankQuestion
  | MatchingQuestion
  | OrderingQuestion
  | OpenEndedQuestion;

export interface Quiz {
  id: string;
  title: string;
  quizType: QuizType;
  subject: string;
  gradeLevel: string;
  topic: string;
  questions: QuizQuestion[];
  includeAnswerKey: boolean;
  generatedAt: string;
}

export type QuizDocumentStatus = "draft" | "saved";

export interface QuizDocument {
  id: string;
  title: string;
  status: QuizDocumentStatus;
  quiz: Quiz;
  createdAt: string;
  updatedAt: string;
}

export type QuizGenerationStatus = "idle" | "loading" | "success" | "error";

export interface QuizFeedback {
  type: "success" | "error";
  message: string;
}
