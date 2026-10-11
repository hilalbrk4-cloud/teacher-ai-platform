/**
 * MEB çerçeve yıllık planlarından üretilen müfredat havuzu. Veriler
 * `scripts/parse-all-curricula.ts` tarafından `references/*.xlsx`
 * dosyalarından üretilir (`src/data/curriculum/`); elle düzenlenmez.
 */

/**
 * "tymm": Türkiye Yüzyılı Maarif Modeli (öğrenme çıktıları, süreç
 * bileşenleri, programlar arası bileşenler).
 * "onceki": henüz TYMM'ye geçmemiş sınıf düzeyleri (kazanım + açıklama).
 */
export type CurriculumProgram = "tymm" | "onceki";

/** Programlar arası bileşen: SDB2.2 İş Birliği, D14 Saygı, OB4 Görsel Okuryazarlık. */
export interface CurriculumTag {
  code: string;
  label: string;
}

export interface CurriculumOutcome {
  /** Resmî kod, ör. "FB.7.4.1", "MAT.7.1.2", "T.O.5.2", "M.8.1.1.1". */
  code: string;
  text: string;
  /** Süreç bileşenleri (a, b, c…) ya da önceki programda kazanım açıklamaları. */
  components: string[];
  sdb: CurriculumTag[];
  values: CurriculumTag[];
  literacy: CurriculumTag[];
  /** Ölçme ve değerlendirme / öğrenme kanıtları. */
  assessment: string[];
}

export interface CurriculumTopic {
  id: string;
  name: string;
  outcomeCodes: string[];
}

export interface CurriculumUnit {
  id: string;
  name: string;
  topics: CurriculumTopic[];
}

export interface CurriculumGradeData {
  /** "fen-bilimleri-7" */
  id: string;
  subject: string;
  subjectId: string;
  grade: number;
  program: CurriculumProgram;
  source: { file: string; sheet: string };
  units: CurriculumUnit[];
  outcomes: Record<string, CurriculumOutcome>;
}

export interface CurriculumIndexEntry {
  id: string;
  subject: string;
  subjectId: string;
  grade: number;
  program: CurriculumProgram;
  unitCount: number;
  topicCount: number;
  outcomeCount: number;
}

/**
 * Sunucunun seçimden çözdüğü resmî müfredat bağlamı. Prompt'a parametre
 * olarak verilir ve plana KOD tarafından eklenir; model kod uyduramaz.
 */
export interface LessonPlanCurriculumContext {
  gradeId: string;
  subject: string;
  grade: number;
  program: CurriculumProgram;
  unit: string;
  topic: string;
  outcomes: Pick<CurriculumOutcome, "code" | "text" | "components">[];
  sdb: CurriculumTag[];
  values: CurriculumTag[];
  literacy: CurriculumTag[];
  assessment: string[];
}

/** Ders Planlayıcı formunda öğretmenin müfredattan yaptığı seçim. */
export interface LessonPlanCurriculumSelection {
  gradeId: string;
  unitId: string;
  topicId: string;
  outcomeCodes: string[];
}
