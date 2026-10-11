import type { LessonPlanCurriculumContext, LessonPlanCurriculumSelection } from "@/types/curriculum";

export const RUBRIC_TASK_TYPES = ["proje", "sunum", "deney", "grup", "portfolyo"] as const;
export type RubricTaskType = (typeof RUBRIC_TASK_TYPES)[number];

/** analitik: kriter bazlı puanlama · butuncul: tek genel düzey · akranOz: öz ve akran değerlendirme. */
export const RUBRIC_TYPES = ["analitik", "butuncul", "akranOz"] as const;
export type RubricType = (typeof RUBRIC_TYPES)[number];

export type RubricScale = 3 | 4;

/**
 * Seviyeler en düşükten en yükseğe sıralıdır; model de seviye açıklamalarını
 * bu sırayla yazar. Etiketler resmî belge dilidir (Word çıktısında da aynen).
 */
export const RUBRIC_SCALE_LEVELS: Record<RubricScale, readonly { id: string; label: string }[]> = {
  3: [
    { id: "gelistirilmeli", label: "Geliştirilmeli" },
    { id: "iyi", label: "İyi" },
    { id: "mukemmel", label: "Mükemmel" },
  ],
  4: [
    { id: "yetersiz", label: "Yetersiz" },
    { id: "gelistirilmeli", label: "Geliştirilmeli" },
    { id: "iyi", label: "İyi" },
    { id: "cokIyi", label: "Çok İyi" },
  ],
};

export interface RubricFormInput {
  subject: string;
  gradeLevel: string;
  topic: string;
  taskType: RubricTaskType;
  rubricType: RubricType;
  scale: RubricScale;
  /** Öğretmenin görevi kısaca anlatması (isteğe bağlı). */
  taskDescription: string;
  curriculum: LessonPlanCurriculumSelection | null;
}

export type RubricRequiredField = "subject" | "gradeLevel" | "topic";
export type RubricFormErrors = Partial<Record<RubricRequiredField, string>>;

/** Resmî, akademik dil: MEB zümre dosyasına konabilecek ölçüt ve seviye tanımları. */
export interface RubricTeacherCriterion {
  title: string;
  description: string;
  /** Seviye sayısı kadar; en düşükten en yükseğe. */
  levels: string[];
}

/** "Sen diliyle" öğrenci/akran kontrol ölçütü. */
export interface RubricStudentCriterion {
  /** Ör. "Kaynaklarını doğru gösterdin mi?" */
  question: string;
  /** Kısa ipucu: "Kaynakçanı ödevinin sonuna ekle." */
  hint: string;
}

export interface RubricCriterion {
  id: string;
  /** Kodla normalize edilmiş ağırlık; tüm kriterlerin toplamı 100. Bütüncül rubrikte 0. */
  weight: number;
  /** Her seviyenin puanı (seviye sırasıyla); en yüksek seviye = weight. */
  levelPoints: number[];
  /** Havuzdan doğrulanmış resmî kodlar: öğrenme çıktısı, SDB, D, OB. */
  skillCodes: string[];
  /** TYMM kavramsal becerileri (sabit listeden, kodsuz). */
  conceptualSkills: string[];
  teacherCriterion: RubricTeacherCriterion;
  studentFriendlyCriterion: RubricStudentCriterion;
}

/** Bütüncül rubrikte tüm performans için tek düzey tanımı (öğretmen + öğrenci dili). */
export interface RubricHolisticLevel {
  teacher: string;
  student: string;
  /** Puan aralığı, ör. { min: 51, max: 75 }. */
  range: { min: number; max: number };
}

export interface Rubric {
  id: string;
  subject: string;
  gradeLevel: string;
  topic: string;
  taskType: RubricTaskType;
  rubricType: RubricType;
  scale: RubricScale;
  taskTitle: string;
  teacherTaskSummary: string;
  studentTaskSummary: string;
  criteria: RubricCriterion[];
  holisticLevels: RubricHolisticLevel[];
  curriculum?: LessonPlanCurriculumContext;
  generatedAt: string;
}

/** Sunucunun prompt'a ve doğrulamaya verdiği bağlam. */
export interface RubricPrompt {
  input: RubricFormInput;
  curriculum?: LessonPlanCurriculumContext;
  /** Kriterlerin bağlanabileceği resmî kodlar (çıktı + SDB + D + OB). */
  allowedSkillCodes: string[];
  instructions: string;
}

export type RubricGenerationStatus = "idle" | "loading" | "success" | "error";

export interface RubricFeedback {
  type: "success" | "error";
  message: string;
}
