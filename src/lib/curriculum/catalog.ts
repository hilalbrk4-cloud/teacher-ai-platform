import curriculumIndex from "@/data/curriculum/index.json";
import type { CurriculumIndexEntry, CurriculumTag } from "@/types/curriculum";

/**
 * İstemci tarafında güvenle kullanılabilen müfredat kataloğu: yalnızca küçük
 * indeks dosyasını içerir (ders, sınıf, sayılar). Sınıf düzeyi verisinin
 * tamamı `/api/curriculum/[id]` üzerinden ihtiyaç anında yüklenir.
 */
export const CURRICULUM_INDEX = curriculumIndex as CurriculumIndexEntry[];

/** Formdaki serbest ders adını havuzdaki derse eşler ("fen", "Fen Bil.", "matematik dersi" …). */
const SUBJECT_ALIASES: { pattern: RegExp; subjectId: string }[] = [
  { pattern: /fen/, subjectId: "fen-bilimleri" },
  { pattern: /mat/, subjectId: "matematik" },
  { pattern: /sosyal/, subjectId: "sosyal-bilgiler" },
  { pattern: /türkçe|turkce/, subjectId: "turkce" },
  { pattern: /inkılap|inkilap|atatürkçülük|ataturkculuk/, subjectId: "t-c-inkilap-tarihi-ve-ataturkculuk" },
  { pattern: /ingilizce|english|yabancı dil/, subjectId: "ingilizce" },
];

export function matchSubjectId(subject: string): string | undefined {
  const normalized = subject.trim().toLocaleLowerCase("tr-TR");
  if (!normalized) return undefined;
  return SUBJECT_ALIASES.find((alias) => alias.pattern.test(normalized))?.subjectId;
}

export function parseGradeNumber(gradeLevel: string): number | undefined {
  const match = /(\d{1,2})/.exec(gradeLevel);
  return match ? Number(match[1]) : undefined;
}

export function findCurriculumEntry(subject: string, gradeLevel: string): CurriculumIndexEntry | undefined {
  const subjectId = matchSubjectId(subject);
  const grade = parseGradeNumber(gradeLevel);
  if (!subjectId || !grade) return undefined;
  return CURRICULUM_INDEX.find((entry) => entry.subjectId === subjectId && entry.grade === grade);
}

/** Ders öneri listesi (havuzdaki dersler, alfabetik). */
export const CURRICULUM_SUBJECTS: string[] = [...new Set(CURRICULUM_INDEX.map((entry) => entry.subject))];

/** Seçili ders için havuzda bulunan sınıf düzeyleri ("5. Sınıf"…). */
export function curriculumGradeOptions(subject: string): string[] {
  const subjectId = matchSubjectId(subject);
  return CURRICULUM_INDEX.filter((entry) => !subjectId || entry.subjectId === subjectId)
    .map((entry) => entry.grade)
    .filter((grade, index, all) => all.indexOf(grade) === index)
    .sort((a, b) => a - b)
    .map((grade) => `${grade}. Sınıf`);
}

const TURKISH_SKILL_AREAS: Record<string, string> = {
  "T.D": "Dinleme/İzleme",
  "T.O": "Okuma",
  "T.K": "Konuşma",
  "T.Y": "Yazma",
};

const ENGLISH_SKILL_AREAS: Record<string, string> = {
  L: "Listening",
  R: "Reading",
  W: "Writing",
  P: "Production",
  S: "Speaking",
  SI: "Spoken Interaction",
  SP: "Spoken Production",
};

/**
 * Çok sayıda çıktısı olan derslerde (Türkçe, İngilizce) çıktıları beceri
 * alanına göre gruplar; diğer derslerde grup yoktur.
 */
export function outcomeGroupLabel(code: string): string | undefined {
  const turkish = /^(T\.[DOKY])\./.exec(code);
  if (turkish) return TURKISH_SKILL_AREAS[turkish[1]];
  const english = /\.([A-Z]{1,2})\d{1,2}$/.exec(code);
  if (english) return ENGLISH_SKILL_AREAS[english[1]];
  const oldTurkish = /^T\.8\.(\d)\./.exec(code);
  if (oldTurkish) return ["Dinleme/İzleme", "Konuşma", "Okuma", "Yazma"][Number(oldTurkish[1]) - 1];
  return undefined;
}

export function formatCurriculumTag(tag: CurriculumTag): string {
  return `${tag.code} ${tag.label}`;
}

/** Bir çıktının form hedeflerine yazılan satırı: "FB.7.4.1 — Ortam değiştiren ışığın…". */
export function outcomeObjectiveLine(outcome: { code: string; text: string }): string {
  return `${outcome.code} — ${outcome.text}`;
}

/** Hedefler metninden belirtilen resmî kodlarla başlayan satırları kaldırır; öğretmenin kendi satırları korunur. */
export function removeOutcomeLines(objectives: string, codes: readonly string[]): string {
  return objectives
    .split("\n")
    .filter((line) => !codes.some((code) => line.trimStart().startsWith(`${code} — `)))
    .join("\n")
    .trim();
}

/** Hedefler metninin sonuna resmî çıktı satırlarını ekler (zaten varsa tekrar eklemez). */
export function appendOutcomeLines(objectives: string, outcomes: { code: string; text: string }[]): string {
  const base = removeOutcomeLines(objectives, outcomes.map((outcome) => outcome.code));
  return [base, ...outcomes.map(outcomeObjectiveLine)].filter(Boolean).join("\n");
}
