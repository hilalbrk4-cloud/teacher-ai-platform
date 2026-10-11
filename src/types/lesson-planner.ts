import type { LessonPlanCurriculumContext, LessonPlanCurriculumSelection } from "@/types/curriculum";

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

/**
 * 5E modeli (TYMM uyumlu) seçildiğinde klasik Giriş / Gelişme / Sonuç ve ayrı
 * "Ölçme ve değerlendirme" bölümü yerine bu beş aşama üretilir.
 */
export const LESSON_PLAN_5E_PHASES = ["girme", "kesfetme", "aciklama", "derinlestirme", "degerlendirme"] as const;

export type LessonPlan5EPhase = (typeof LESSON_PLAN_5E_PHASES)[number];

export const LESSON_PLAN_5E_SECTION_ORDER = [
  "dersBilgileri",
  "ogrenmeHedefleri",
  "gerekliMalzemeler",
  "derseHazirlik",
  ...LESSON_PLAN_5E_PHASES,
  "farklilastirma",
  "ogretmenNotlari",
] as const;

export type LessonPlanSectionKey = (typeof LESSON_PLAN_SECTION_ORDER)[number] | LessonPlan5EPhase;

export type LessonPlanModel = "klasik" | "5e";

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
  /** MEB müfredat havuzundan seçilen ünite/konu ve resmî öğrenme çıktıları (seçim yoksa null). */
  curriculum?: LessonPlanCurriculumSelection | null;
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
  /** "5e" seçiliyse bölümler 5E aşamalarıdır; aksi hâlde klasik Giriş/Gelişme/Sonuç. */
  model: LessonPlanModel;
  requiredSections: readonly LessonPlanSectionKey[];
  /** Yalnızca 5E'de: koddan hesaplanan aşama aralıkları (toplamı ders süresine eşit). */
  phaseTimeRanges?: Record<LessonPlan5EPhase, LessonPlanTimeRange>;
  /** Sunucunun müfredat havuzundan çözdüğü resmî çıktılar ve programlar arası bileşenler. */
  officialCurriculum?: LessonPlanCurriculumContext;
  language: "tr";
}

/**
 * Full Prompt Builder output: the structured context plus the compiled
 * natural-language instructions ready to send to a real AI model.
 */
export interface LessonPlanPrompt extends LessonPlanPromptContext {
  instructions: string;
}

/** Bir aşamanın ders içindeki dakika aralığı (00–04 dk gibi); kod hesaplar, toplamı ders süresini aşmaz. */
export interface LessonPlanTimeRange {
  start: number;
  end: number;
}

export interface LessonPlanSection {
  key: LessonPlanSectionKey;
  content: string;
  timeRange?: LessonPlanTimeRange;
}

/**
 * TYMM Beceriler Örgüsü: plan hangi kavramsal becerileri (KB), sosyal-duygusal
 * öğrenme becerilerini (SDB), eğilimleri ve değerleri hedefliyor. Etiketler
 * sabit listelerden seçilir (bkz. `tymm-skills.ts`); kod uydurulmaz.
 */
export interface LessonPlanSkills {
  conceptual: string[];
  socialEmotional: string[];
  dispositions: string[];
  values: string[];
}

export interface LessonPlan {
  id: string;
  subject: string;
  gradeLevel: string;
  topic: string;
  duration: number;
  sections: LessonPlanSection[];
  generatedAt: string;
  /** "5e" ise bölümler 5E aşamalarıdır ve her aşamanın `timeRange`ı vardır. */
  model?: LessonPlanModel;
  skills?: LessonPlanSkills;
  /** Resmî müfredat seçimi yapıldıysa: kodlar, SDB, Değerler ve OB (kod tarafından eklenir). */
  curriculum?: LessonPlanCurriculumContext;
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
