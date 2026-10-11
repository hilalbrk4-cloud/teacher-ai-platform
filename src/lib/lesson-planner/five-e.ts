import {
  LESSON_PLAN_5E_PHASES,
  LESSON_PLAN_5E_SECTION_ORDER,
  LESSON_PLAN_SECTION_ORDER,
  type LessonPlan5EPhase,
  type LessonPlanModel,
  type LessonPlanRefinementId,
  type LessonPlanSectionKey,
  type LessonPlanTimeRange,
} from "@/types/lesson-planner";

/**
 * 5E aşamalarının ders süresi içindeki ağırlıkları (Girme kısa, Keşfetme en
 * uzun, Değerlendirme çıkış bileti için yeterli). Süre aralıklarını model
 * değil KOD hesaplar: toplam her zaman ders süresine eşittir, asla aşmaz.
 */
const FIVE_E_WEIGHTS: Record<LessonPlan5EPhase, number> = {
  girme: 0.1,
  kesfetme: 0.3,
  aciklama: 0.2,
  derinlestirme: 0.25,
  degerlendirme: 0.15,
};

/** Bir aşamanın alabileceği en kısa süre (dakika). */
const MIN_PHASE_MINUTES = 2;

export function lessonPlanModel(refinements: readonly LessonPlanRefinementId[]): LessonPlanModel {
  return refinements.includes("fiveE") ? "5e" : "klasik";
}

export function lessonPlanSectionOrder(model: LessonPlanModel): readonly LessonPlanSectionKey[] {
  return model === "5e" ? LESSON_PLAN_5E_SECTION_ORDER : LESSON_PLAN_SECTION_ORDER;
}

export function isFiveEPhase(key: LessonPlanSectionKey): key is LessonPlan5EPhase {
  return (LESSON_PLAN_5E_PHASES as readonly string[]).includes(key);
}

/**
 * Ders süresini 5E aşamalarına dakika aralığı olarak böler. Her aşama tam
 * dakikadır ve en az {@link MIN_PHASE_MINUTES} dakikadır; yuvarlamadan kalan
 * dakikalar en uzun aşamalara (Keşfetme, Derinleştirme…) dağıtılır. Son
 * aşamanın bitişi tam olarak ders süresidir.
 */
export function fiveETimeRanges(durationMinutes: number): Record<LessonPlan5EPhase, LessonPlanTimeRange> {
  const total = Math.max(Math.round(durationMinutes), LESSON_PLAN_5E_PHASES.length * MIN_PHASE_MINUTES);
  const minutes = LESSON_PLAN_5E_PHASES.map((phase) => Math.max(MIN_PHASE_MINUTES, Math.floor(total * FIVE_E_WEIGHTS[phase])));
  const byWeight = [...LESSON_PLAN_5E_PHASES.keys()].sort(
    (a, b) => FIVE_E_WEIGHTS[LESSON_PLAN_5E_PHASES[b]] - FIVE_E_WEIGHTS[LESSON_PLAN_5E_PHASES[a]]
  );
  // Yuvarlama farkını kapat: eksikse ağır aşamalara ekle, fazlaysa (kısa derste en az süre kuralı) ağırlardan düş.
  let difference = total - minutes.reduce((sum, value) => sum + value, 0);
  for (let i = 0; difference !== 0; i = (i + 1) % byWeight.length) {
    const index = byWeight[i];
    if (difference > 0) {
      minutes[index] += 1;
      difference -= 1;
    } else if (minutes[index] > MIN_PHASE_MINUTES) {
      minutes[index] -= 1;
      difference += 1;
    }
  }
  let start = 0;
  const ranges = {} as Record<LessonPlan5EPhase, LessonPlanTimeRange>;
  LESSON_PLAN_5E_PHASES.forEach((phase, index) => {
    ranges[phase] = { start, end: start + minutes[index] };
    start += minutes[index];
  });
  return ranges;
}

/** "04–16 dk" */
export function formatTimeRange(range: LessonPlanTimeRange): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(range.start)}–${pad(range.end)} dk`;
}
