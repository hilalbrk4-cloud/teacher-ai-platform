export const LESSON_PLAN_SECTION_ORDER = [
  "dersBilgileri",
  "ogrenmeHedefleri",
  "gerekliMalzemeler",
  "derseHazirlik",
  "giris",
  "gelisme",
  "sonuc",
  "olcmeDegerlendirme",
  "farklilastirma",
  "ogretmenNotlari",
] as const;

export type LessonPlanSectionKey = (typeof LESSON_PLAN_SECTION_ORDER)[number];

export type LessonPlanRefinementId =
  | "fiveE"
  | "groupWork"
  | "warmUpActivity"
  | "inclusionAdaptation";

export interface LessonPlanFormInput {
  subject: string;
  gradeLevel: string;
  topic: string;
  duration: number;
  objectives: string;
  teachingApproach: string;
  studentLevel: string;
  materials: string;
  assessmentPreference: string;
  specialNeeds: string;
  additionalNotes: string;
  refinements: LessonPlanRefinementId[];
}

export type LessonPlanRequiredField = "subject" | "gradeLevel" | "topic" | "duration" | "objectives";

export type LessonPlanFormErrors = Partial<Record<LessonPlanRequiredField, string>>;

/**
 * Structured, typed context the Prompt Builder derives from teacher input.
 * This is what any AI generation service (mock today, a real model later)
 * can rely on programmatically, independent of the natural-language prompt.
 */
export interface LessonPlanPromptContext {
  role: string;
  subject: string;
  gradeLevel: string;
  topic: string;
  durationMinutes: number;
  outcomes: string;
  teachingMethod?: string;
  studentLevel?: string;
  materials?: string;
  assessmentPreference?: string;
  specialNeeds?: string;
  additionalNotes?: string;
  refinements: LessonPlanRefinementId[];
  requiredSections: readonly LessonPlanSectionKey[];
  language: "tr";
}

/**
 * Full Prompt Builder output: the structured context plus the compiled
 * natural-language instructions ready to send to a real AI model.
 */
export interface LessonPlanPrompt extends LessonPlanPromptContext {
  instructions: string;
}

export interface LessonPlanSection {
  key: LessonPlanSectionKey;
  content: string;
}

export interface LessonPlan {
  id: string;
  subject: string;
  gradeLevel: string;
  topic: string;
  duration: number;
  sections: LessonPlanSection[];
  generatedAt: string;
}

export type LessonPlanDocumentStatus = "draft" | "saved";

export interface LessonPlanDocument {
  id: string;
  title: string;
  status: LessonPlanDocumentStatus;
  plan: LessonPlan;
  createdAt: string;
  updatedAt: string;
}

export type LessonPlanGenerationStatus = "idle" | "loading" | "success" | "error";

export interface LessonPlanFeedback {
  type: "success" | "error";
  message: string;
}
