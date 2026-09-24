import type { GorselSoruPlani } from "@/types/gorsel-soru";
import type {
  CognitiveLevel,
  DifficultyLevel,
  QuestionApproach,
  QuestionType,
  QuizType,
  SlotVisualType,
} from "@/types/quiz-generator";

/**
 * One planned question slot. Every field here is decided by
 * `buildQuizBlueprint` before any AI call is made — the Prompt Builder and
 * validator both treat this as the authoritative plan for the question at
 * this position, not a suggestion the AI is free to reinterpret.
 */
export interface QuestionBlueprintSlot {
  order: number;
  type: QuestionType;
  cognitiveLevel: CognitiveLevel;
  learningOutcome: string;
  difficulty: DifficultyLevel;
  approach: QuestionApproach;
  visualType: SlotVisualType;
  /** Only on `gorselSoru` slots: the tip and task this question must use (see `gorselSoruPlaniAta`). */
  gorselPlani?: GorselSoruPlani;
}

/**
 * The complete generation plan for one quiz, produced by
 * `buildQuizBlueprint` from raw `QuizFormInput`. This — not the raw form —
 * is what `buildQuizPrompt` and the response validator consume. It is the
 * single source of truth for question order, type, cognitive level,
 * learning-outcome mapping, difficulty distribution, visual allocation,
 * and approach.
 */
export interface QuizBlueprint {
  quizType: QuizType;
  subject: string;
  gradeLevel: string;
  topic: string;
  totalQuestions: number;
  includeAnswerKey: boolean;
  includeExplanations: boolean;
  slots: QuestionBlueprintSlot[];
  language: "tr";
}

/**
 * Full Prompt Builder output: the Blueprint plus the compiled
 * natural-language instructions ready to send to a real AI model.
 */
export interface QuizPrompt extends QuizBlueprint {
  instructions: string;
}
