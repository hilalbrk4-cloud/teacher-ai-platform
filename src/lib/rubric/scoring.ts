import type { RubricScale } from "@/types/rubric";

/** Rubriğin toplam puanı; ağırlıklar ve seviye puanları buna göre hesaplanır. */
export const RUBRIC_TOTAL_POINTS = 100;
const MIN_WEIGHT = 5;

/**
 * Modelin önerdiği ağırlıkları toplamı tam 100 olan, 5'in katı tam sayılara
 * çevirir (en büyük kalan yöntemi). Model sayıyı yanlış toplasa da toplam
 * puan hiçbir zaman 100'den sapmaz.
 */
export function normalizeWeights(raw: number[]): number[] {
  if (raw.length === 0) return [];
  const safe = raw.map((value) => (Number.isFinite(value) && value > 0 ? value : 1));
  const sum = safe.reduce((total, value) => total + value, 0);
  const step = 5;
  const units = RUBRIC_TOTAL_POINTS / step;
  const exact = safe.map((value) => (value / sum) * units);
  const result = exact.map((value) => Math.max(MIN_WEIGHT / step, Math.floor(value)));
  let remaining = units - result.reduce((total, value) => total + value, 0);
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; remaining !== 0; i = (i + 1) % byRemainder.length) {
    const { index } = byRemainder[i];
    if (remaining > 0) {
      result[index] += 1;
      remaining -= 1;
    } else if (result[index] > MIN_WEIGHT / step) {
      result[index] -= 1;
      remaining += 1;
    }
  }
  return result.map((value) => value * step);
}

/** Seviye puanları (en düşükten en yükseğe); en yüksek seviye kriterin ağırlığına eşittir. */
export function levelPoints(weight: number, scale: RubricScale): number[] {
  return Array.from({ length: scale }, (_, index) => Math.round((weight * (index + 1)) / scale));
}

/** Bütüncül rubrikte her düzeyin puan aralığı: 4 düzeyde 0–25, 26–50, 51–75, 76–100. */
export function holisticRanges(scale: RubricScale): { min: number; max: number }[] {
  return Array.from({ length: scale }, (_, index) => ({
    min: index === 0 ? 0 : Math.floor((RUBRIC_TOTAL_POINTS * index) / scale) + 1,
    max: Math.floor((RUBRIC_TOTAL_POINTS * (index + 1)) / scale),
  }));
}
