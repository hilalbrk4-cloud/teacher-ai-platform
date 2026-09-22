import { COGNITIVE_LEVELS, QUESTION_APPROACHES } from "@/types/quiz-generator";
import type {
  CognitiveLevel,
  DifficultyLevel,
  QuestionApproach,
  QuestionType,
  QuizFormInput,
  SlotVisualType,
  VisualType,
} from "@/types/quiz-generator";
import type { QuestionBlueprintSlot, QuizBlueprint } from "@/types/quiz-blueprint";

const MATH_SUBJECT_KEYWORDS = ["matematik", "math"];
const SCIENCE_SUBJECT_KEYWORDS = ["fen", "science", "biyoloji", "kimya", "fizik"];

const DEFAULT_MATH_VISUALS: VisualType[] = [
  "graph",
  "numberLine",
  "coordinatePlane",
  "geometryDiagram",
  "fractionModel",
];
const DEFAULT_SCIENCE_VISUALS: VisualType[] = ["scientificDiagram", "experimentSetup", "table", "graph"];
const DEFAULT_GENERIC_VISUALS: VisualType[] = ["table", "flowChart", "customSvg"];

// Deterministic cognitive-level cycle used only when the teacher's chosen
// approach is "newGeneration" — biases toward apply/analyze per the
// product brief, without ever calling Math.random.
const NEW_GENERATION_COGNITIVE_CYCLE: CognitiveLevel[] = [
  "apply",
  "analyze",
  "apply",
  "analyze",
  "understand",
  "evaluate",
];

const DIFFICULTY_CYCLES: Record<DifficultyLevel | "mixed", DifficultyLevel[]> = {
  easy: ["easy", "easy", "easy", "medium"],
  medium: ["medium", "medium", "easy", "medium", "hard"],
  hard: ["hard", "hard", "medium", "hard"],
  mixed: ["easy", "medium", "hard"],
};

// Quiz types meant to be short and low-stakes keep their natural question
// order instead of being resequenced by difficulty.
const FLAT_ORDER_QUIZ_TYPES = new Set(["exitTicket"]);

function matchesSubjectKeyword(subject: string, keywords: string[]): boolean {
  const normalized = subject.trim().toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

export function isMathSubject(subject: string): boolean {
  return matchesSubjectKeyword(subject, MATH_SUBJECT_KEYWORDS);
}

export function isScienceSubject(subject: string): boolean {
  return matchesSubjectKeyword(subject, SCIENCE_SUBJECT_KEYWORDS);
}

/**
 * Step 1: question order & type distribution. Splits `questionCount`
 * across the teacher's selected question types by cycling through them in
 * order, so remainders spread round-robin rather than piling onto one type
 * (e.g. 10 questions / 3 types -> 4/3/3).
 */
function distributeQuestionTypes(input: QuizFormInput): QuestionType[] {
  const types = input.questionTypes.length > 0 ? input.questionTypes : (["multipleChoice"] as QuestionType[]);
  return Array.from({ length: input.questionCount }, (_, index) => types[index % types.length]);
}

/**
 * Step 2: cognitive level assignment. Uses the teacher's explicit choice
 * for every slot, unless "newGeneration" was selected as the approach — in
 * which case a deterministic cycle biases the quiz toward apply/analyze.
 */
function assignCognitiveLevel(index: number, input: QuizFormInput): CognitiveLevel {
  if (input.questionApproach === "newGeneration") {
    return NEW_GENERATION_COGNITIVE_CYCLE[index % NEW_GENERATION_COGNITIVE_CYCLE.length];
  }
  return COGNITIVE_LEVELS.includes(input.cognitiveLevel) ? input.cognitiveLevel : "understand";
}

/**
 * Step 3: learning outcome distribution. Parses the teacher's freeform
 * `objectives` text into discrete outcomes (newline / semicolon / numbered
 * list separated), falling back to the whole string as a single outcome.
 * Outcomes are then cycled round-robin across every slot so multi-pass
 * distribution keeps spreading rather than repeating outcome 1 forever.
 */
function parseLearningOutcomes(objectives: string): string[] {
  const trimmed = objectives.trim();
  if (!trimmed) return ["Genel öğrenme hedefi"];

  const numberedSplit = trimmed
    .split(/(?:^|\n)\s*\d+[.)]\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (numberedSplit.length > 1) return numberedSplit;

  const lineSplit = trimmed
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (lineSplit.length > 1) return lineSplit;

  return [trimmed];
}

function distributeLearningOutcomes(count: number, objectives: string): string[] {
  const outcomes = parseLearningOutcomes(objectives);
  return Array.from({ length: count }, (_, index) => outcomes[index % outcomes.length]);
}

/**
 * Step 4: difficulty distribution. Every slot gets a concrete
 * easy/medium/hard value from a fixed per-tier curve — difficulty is never
 * a single quiz-wide value in the contract, only a per-question one.
 */
function distributeDifficulty(count: number, difficulty: DifficultyLevel | "mixed"): DifficultyLevel[] {
  const cycle = DIFFICULTY_CYCLES[difficulty] ?? DIFFICULTY_CYCLES.medium;
  return Array.from({ length: count }, (_, index) => cycle[index % cycle.length]);
}

function defaultVisualTypesForSubject(subject: string): VisualType[] {
  if (isMathSubject(subject)) return DEFAULT_MATH_VISUALS;
  if (isScienceSubject(subject)) return DEFAULT_SCIENCE_VISUALS;
  return DEFAULT_GENERIC_VISUALS;
}

/**
 * Step 5: visual allocation. Decides which slot indices get a visual
 * (based on `visualUsage`) and which `VisualType` (teacher's explicit
 * choice if given, otherwise a subject-appropriate default list), cycled
 * round-robin across the allocated slots.
 */
function allocateVisuals(count: number, input: QuizFormInput): SlotVisualType[] {
  if (input.visualUsage === "none") {
    return Array.from({ length: count }, () => "none" as const);
  }

  const visualTypes = input.visualTypes.length > 0 ? input.visualTypes : defaultVisualTypesForSubject(input.subject);
  // "whenAppropriate" allocates roughly one in three slots; "visualHeavy"
  // allocates every other slot. Both are deterministic, not random.
  const stride = input.visualUsage === "visualHeavy" ? 2 : 3;

  let visualCursor = 0;
  return Array.from({ length: count }, (_, index) => {
    if (index % stride !== 0) return "none" as const;
    const visualType = visualTypes[visualCursor % visualTypes.length];
    visualCursor += 1;
    return visualType;
  });
}

/**
 * Step 6: approach assignment. Fixed per slot from the teacher's choice,
 * unless "mixed" was selected, in which case slots cycle through the
 * approach catalogue (excluding "mixed" itself).
 */
function distributeApproach(count: number, input: QuizFormInput): QuestionApproach[] {
  if (input.questionApproach !== "mixed") {
    return Array.from({ length: count }, () => input.questionApproach);
  }
  const cycle = QUESTION_APPROACHES.filter((approach) => approach !== "mixed");
  return Array.from({ length: count }, (_, index) => cycle[index % cycle.length]);
}

const DIFFICULTY_RANK: Record<DifficultyLevel, number> = { easy: 0, medium: 1, hard: 2 };

/**
 * Step 7: ordering. Reorders slots easier-first for most quiz types (a
 * stable sort by difficulty rank), except quiz types meant to stay short
 * and flat (e.g. exit tickets), which keep their original sequence.
 * Runs last and separately from steps 1-6 so distribution logic never has
 * to also reason about final sequencing.
 */
function orderSlots(slots: Omit<QuestionBlueprintSlot, "order">[], quizType: QuizFormInput["quizType"]): QuestionBlueprintSlot[] {
  const sequenced = FLAT_ORDER_QUIZ_TYPES.has(quizType)
    ? slots
    : [...slots].sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]);

  return sequenced.map((slot, index) => ({ ...slot, order: index }));
}

/**
 * Converts raw teacher input into a `QuizBlueprint` — a fully-decided,
 * deterministic generation plan. No AI call happens before this function
 * returns; the Prompt Builder and generation service only ever see the
 * resulting Blueprint, never the raw `QuizFormInput`, which is what makes
 * the Blueprint the single source of truth for a quiz's generation.
 *
 * Pure and side-effect free: no network calls, no `process.env` access, no
 * randomness (`Math.random`), and `input` is only ever read, never mutated.
 */
export function buildQuizBlueprint(input: QuizFormInput): QuizBlueprint {
  const count = input.questionCount;

  const types = distributeQuestionTypes(input);
  const outcomes = distributeLearningOutcomes(count, input.objectives);
  const difficulties = distributeDifficulty(count, input.difficulty);
  const visuals = allocateVisuals(count, input);
  const approaches = distributeApproach(count, input);

  const unorderedSlots: Omit<QuestionBlueprintSlot, "order">[] = Array.from({ length: count }, (_, index) => ({
    type: types[index],
    cognitiveLevel: assignCognitiveLevel(index, input),
    learningOutcome: outcomes[index],
    difficulty: difficulties[index],
    approach: approaches[index],
    visualType: visuals[index],
  }));

  return {
    quizType: input.quizType,
    subject: input.subject.trim(),
    gradeLevel: input.gradeLevel.trim(),
    topic: input.topic.trim(),
    totalQuestions: count,
    includeAnswerKey: input.includeAnswerKey,
    includeExplanations: input.includeExplanations,
    slots: orderSlots(unorderedSlots, input.quizType),
    language: "tr",
  };
}
