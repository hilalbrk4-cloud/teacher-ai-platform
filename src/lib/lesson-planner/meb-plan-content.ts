import { TYMM_SKILL_GROUP_LABELS, TYMM_SKILL_GROUP_ORDER } from "@/lib/lesson-planner/tymm-skills";
import { EDUPILOT_SPARK_MARKER } from "@/lib/lesson-planner/teaching-library";
import type { LessonPlan, LessonPlanSectionKey, LessonPlanTimeRange } from "@/types/lesson-planner";

/**
 * Bir ders planını MEB günlük ders planı formunun alanlarına dönüştürür.
 * Saf veri katmanıdır (docx'e bağımlı değildir); Word çıktısı bu modeli
 * olduğu gibi tabloya döker. Belge resmî bir form olduğundan etiketler
 * Türkçedir ve arayüz dilinden bağımsızdır.
 */

export interface MebPlanProcessRow {
  phase: string;
  focus?: string;
  /** "00–04 dk"; klasik planda süre bilinmiyorsa "—". */
  time: string;
  /** "4 dk" (yalnızca süre aralığı biliniyorsa). */
  minutes?: string;
  content: string[];
}

export interface MebPlanContent {
  title: string;
  info: { label: string; value: string }[];
  objectives: string[];
  materials: string[];
  skills: { code: string; label: string; items: string[] }[];
  processTitle: string;
  processRows: MebPlanProcessRow[];
  /**
   * Çıkış biletinin dışındaki süreç değerlendirme metni (gözlem ölçütleri vb.).
   * 5E planında bu metin zaten Değerlendirme aşaması satırındadır; tekrar edilmez.
   */
  processAssessment: string[];
  exitTicket: { questions: string[]; note: string[] };
  differentiation: string[];
  dateText: string;
}

const PHASE_ROWS: { key: LessonPlanSectionKey; phase: string; focus: string }[] = [
  { key: "girme", phase: "Girme", focus: "Merak uyandırma" },
  { key: "kesfetme", phase: "Keşfetme", focus: "Deneyimleme" },
  { key: "aciklama", phase: "Açıklama", focus: "Kavram oluşturma" },
  { key: "derinlestirme", phase: "Derinleştirme", focus: "Transfer ve uygulama" },
  { key: "degerlendirme", phase: "Değerlendirme", focus: "Süreç odaklı ölçme" },
];

const CLASSIC_ROWS: { key: LessonPlanSectionKey; phase: string }[] = [
  { key: "giris", phase: "Giriş" },
  { key: "gelisme", phase: "Gelişme" },
  { key: "sonuc", phase: "Sonuç" },
];

const EXIT_TICKET_MARKER = /çıkış bileti\s*:?/i;
const NUMBERED_ITEM = /^(\d+)[).]\s*(.+)$/;

/** Boş satırları atar, satır başı madde işaretlerini temizler, imza etkinliği yıldızını kaldırır. */
export function toLines(content: string | undefined): string[] {
  return (content ?? "")
    .replace(EDUPILOT_SPARK_MARKER, "EduPilot Etkinliği:")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•]\s+/, "").trim())
    .filter(Boolean);
}

/** Satırları ve aynı satırdaki "1) … 2) …" biçimindeki maddeleri ayrı maddelere böler. */
function splitNumbered(lines: string[]): { items: string[]; rest: string[] } {
  const items: string[] = [];
  const rest: string[] = [];
  for (const line of lines) {
    const parts = line.split(/\s+(?=\d+[).]\s)/);
    const numbered = parts.map((part) => NUMBERED_ITEM.exec(part.trim()));
    if (numbered.every(Boolean)) items.push(...numbered.map((match) => match![2].trim()));
    else rest.push(line);
  }
  return { items, rest };
}

/**
 * Değerlendirme metninden çıkış bileti sorularını ayırır. "Çıkış Bileti:"
 * işaretinden sonraki numaralı maddeler sorudur; numarasız satırlar
 * (biletlerin nasıl toplanacağı gibi) not olarak kalır.
 */
export function extractExitTicket(content: string): {
  before: string[];
  questions: string[];
  note: string[];
} {
  const match = EXIT_TICKET_MARKER.exec(content);
  if (!match) return { before: toLines(content), questions: [], note: [] };
  const before = toLines(content.slice(0, match.index));
  const { items, rest } = splitNumbered(toLines(content.slice(match.index + match[0].length)));
  // Numarasız tek cümlelik bilet ("… sorusunu yanıtlayacakları bir çıkış bileti") de soru sayılır.
  return items.length > 0 ? { before, questions: items, note: rest } : { before, questions: rest, note: [] };
}

function formatRange(range: LessonPlanTimeRange): { time: string; minutes: string } {
  const pad = (value: number) => String(value).padStart(2, "0");
  return { time: `${pad(range.start)}–${pad(range.end)} dk`, minutes: `${range.end - range.start} dk` };
}

export function formatTurkishDate(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function buildMebPlanContent(plan: LessonPlan, date: Date = new Date()): MebPlanContent {
  const section = (key: LessonPlanSectionKey) => plan.sections.find((item) => item.key === key);
  const isFiveE = plan.model === "5e" || Boolean(section("girme"));
  const dateText = formatTurkishDate(date);

  const processRows: MebPlanProcessRow[] = isFiveE
    ? PHASE_ROWS.map(({ key, phase, focus }) => {
        const current = section(key);
        // Değerlendirme satırında çıkış bileti ayrı bölümde verildiği için yalnızca süreç kısmı ve kısa atıf yer alır.
        let content = toLines(current?.content);
        if (key === "degerlendirme") {
          const ticket = extractExitTicket(current?.content ?? "");
          if (ticket.questions.length > 0) {
            content = [...ticket.before, "Çıkış bileti uygulanır (sorular: Ölçme ve Değerlendirme bölümü)."];
          }
        }
        return { phase, focus, ...(current?.timeRange ? formatRange(current.timeRange) : { time: "—" }), content };
      })
    : CLASSIC_ROWS.map(({ key, phase }) => ({ phase, time: "—", content: toLines(section(key)?.content) }));

  const assessmentSource = section(isFiveE ? "degerlendirme" : "olcmeDegerlendirme")?.content ?? "";
  const ticket = extractExitTicket(assessmentSource);

  return {
    title: `${plan.subject.toLocaleUpperCase("tr-TR")} DERSİ GÜNLÜK DERS PLANI`,
    info: [
      { label: "Okul Adı", value: "" },
      { label: "Ders", value: plan.subject },
      { label: "Sınıf", value: plan.gradeLevel },
      { label: "Süre", value: `${plan.duration} dk` },
      { label: "Konu", value: plan.topic },
      { label: "Tarih", value: dateText },
      ...(plan.curriculum ? [{ label: "Ünite / Tema", value: plan.curriculum.unit }] : []),
    ],
    objectives: toLines(section("ogrenmeHedefleri")?.content),
    materials: toLines(section("gerekliMalzemeler")?.content),
    skills: [
      ...(plan.skills
        ? TYMM_SKILL_GROUP_ORDER.filter((group) => plan.skills![group].length > 0).map((group) => ({
            code: TYMM_SKILL_GROUP_LABELS[group].short,
            label: TYMM_SKILL_GROUP_LABELS[group].label,
            items: plan.skills![group],
          }))
        : []),
      // Resmî müfredattan gelen Okuryazarlık becerileri (kodlarıyla).
      ...(plan.curriculum && plan.curriculum.literacy.length > 0
        ? [
            {
              code: "OB",
              label: "Okuryazarlık Becerileri",
              items: plan.curriculum.literacy.map((tag) => `${tag.code} ${tag.label}`),
            },
          ]
        : []),
    ],
    processTitle: isFiveE ? "5E UYGULAMA SÜRECİ" : "UYGULAMA SÜRECİ",
    processRows,
    processAssessment: isFiveE ? [] : ticket.before,
    exitTicket: { questions: ticket.questions, note: ticket.note },
    differentiation: toLines(section("farklilastirma")?.content),
    dateText,
  };
}

/** "[Ders]_[Konu]_Ders_Plani.docx" — boşluklar alt çizgi olur, dosya adında geçersiz karakterler atılır. */
export function lessonPlanDocxFileName(plan: Pick<LessonPlan, "subject" | "topic">): string {
  const part = (value: string) =>
    value
      .trim()
      .replace(/[\\/:*?"<>|.]+/g, "")
      .replace(/\s+/g, "_") || "Ders";
  return `${part(plan.subject)}_${part(plan.topic)}_Ders_Plani.docx`;
}
