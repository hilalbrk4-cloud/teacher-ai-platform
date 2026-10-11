import type { LiveScore, LiveStatus } from "@/lib/rubric/live/types";
import type { Rubric } from "@/types/rubric";

export function emptyScore(): LiveScore {
  return { levels: {}, feedback: "", feedbackEdited: false };
}

/** Toplam puan; puanlanmamış kriterler 0 sayılır. Bütüncülde seçilen düzeyin puanı. */
export function liveTotal(rubric: Rubric, score: LiveScore | undefined): number {
  if (!score) return 0;
  if (rubric.rubricType === "butuncul") return score.holisticScore ?? 0;
  return rubric.criteria.reduce((sum, criterion) => {
    const level = score.levels[criterion.id];
    return sum + (level === undefined ? 0 : (criterion.levelPoints[level] ?? 0));
  }, 0);
}

export function liveStatus(rubric: Rubric, score: LiveScore | undefined): LiveStatus {
  if (!score) return "waiting";
  if (rubric.rubricType === "butuncul") return score.holisticLevel === undefined ? "waiting" : "done";
  const scored = rubric.criteria.filter((criterion) => score.levels[criterion.id] !== undefined).length;
  if (scored === 0) return "waiting";
  return scored === rubric.criteria.length ? "done" : "partial";
}

/** Bütüncül düzey seçildiğinde varsayılan puan: düzey aralığının üst sınırı (öğretmen aralık içinde değiştirebilir). */
export function holisticDefaultScore(rubric: Rubric, level: number): number {
  return rubric.holisticLevels[level]?.range.max ?? 0;
}

export function clampHolisticScore(rubric: Rubric, level: number, value: number): number {
  const range = rubric.holisticLevels[level]?.range;
  if (!range || !Number.isFinite(value)) return holisticDefaultScore(rubric, level);
  return Math.min(range.max, Math.max(range.min, Math.round(value)));
}

const quote = (title: string) => `“${title}”`;

function joinTitles(titles: string[]): string {
  const quoted = titles.map(quote);
  return quoted.length <= 1 ? quoted.join("") : `${quoted.slice(0, -1).join(", ")} ve ${quoted.at(-1)}`;
}

/**
 * Kural tabanlı, anında çalışan öğrenci geri bildirimi (1-2 cümle, sen dili).
 * Güçlü yönler en üst seviyedeki kriterlerden, gelişim alanı en düşük
 * seviyedeki kriterden ve o kriterin rubrikteki öğrenci ipucundan gelir.
 * Kriter adları ek almadan tırnak içinde kullanılır (Türkçe ek uyumu hatası olmaz).
 */
export function generateLiveFeedback(rubric: Rubric, studentName: string, score: LiveScore): string {
  const firstName = studentName.trim().split(/\s+/)[0] ?? "";
  const top = rubric.scale - 1;

  if (rubric.rubricType === "butuncul") {
    const level = score.holisticLevel;
    if (level === undefined) return "";
    const description = rubric.holisticLevels[level]?.student ?? "";
    const next =
      level === top
        ? "Bu özeni bir sonraki çalışmanda da sürdür!"
        : `Bir sonraki çalışmada ${quote(rubric.criteria[0]?.teacherCriterion.title ?? "")} başta olmak üzere kontrol listendeki soruları kendine sorarak bir üst düzeye çıkabilirsin.`;
    return `${firstName}, ${description.charAt(0).toLocaleLowerCase("tr-TR")}${description.slice(1)} ${next}`.replace(/\s+/g, " ").trim();
  }

  const scored = rubric.criteria
    .filter((criterion) => score.levels[criterion.id] !== undefined)
    .map((criterion) => ({ criterion, level: score.levels[criterion.id] }));
  if (scored.length === 0) return "";

  const titlesAt = (level: number) =>
    scored
      .filter((item) => item.level === level)
      .sort((a, b) => b.criterion.weight - a.criterion.weight)
      .map((item) => item.criterion.teacherCriterion.title)
      .slice(0, 2);
  /** "ölçütünde" / "ölçütlerinde": iki kriter anılınca çoğul. */
  const inCriteria = (titles: string[]) => `${joinTitles(titles)} ${titles.length > 1 ? "ölçütlerinde" : "ölçütünde"}`;

  const highest = Math.max(...scored.map((item) => item.level));
  const lowest = Math.min(...scored.map((item) => item.level));
  // Genel başarı oranı (puanlanan kriterler üzerinden) tonu belirler: tek bir düşük kriter genel tabloyu karartmaz.
  const earned = scored.reduce((sum, item) => sum + item.criterion.levelPoints[item.level], 0);
  const possible = scored.reduce((sum, item) => sum + item.criterion.weight, 0);
  const ratio = possible > 0 ? earned / possible : 0;
  // En düşük seviyedeki kriterlerden ağırlığı en yüksek olan gelişim alanı seçilir.
  const weakest = scored
    .filter((item) => item.level === lowest && item.level < top)
    .sort((a, b) => b.criterion.weight - a.criterion.weight)[0];
  const hint = weakest?.criterion.studentFriendlyCriterion.hint.replace(/\.?$/, ".") ?? "";
  const focus = weakest ? quote(weakest.criterion.teacherCriterion.title) : "";

  if (!weakest) {
    const strengths = titlesAt(top);
    return scored.length === rubric.criteria.length
      ? `${firstName}, tüm ölçütlerde en üst düzeyde bir çalışma ortaya koydun; özellikle ${quote(strengths[0])} ölçütündeki başarın dikkat çekici. Bu emeğini sürdür!`
      : `${firstName}, ${inCriteria(strengths)} çok güçlü bir performans gösterdin. Bu özeni diğer ölçütlerde de sürdür!`;
  }
  if (highest === top) {
    return `${firstName}, ${inCriteria(titlesAt(top))} güçlü bir performans gösterdin. Bir sonraki çalışmada ${focus} ölçütüne odaklan: ${hint}`;
  }
  if (ratio < 0.4) {
    return `${firstName}, bu görevde emek verdiğin görülüyor; seni en çok ${focus} ölçütüne odaklanmak ilerletecek: ${hint} Takıldığın yerde yardım istemekten çekinme.`;
  }
  if (highest > lowest) {
    return `${firstName}, ${inCriteria(titlesAt(highest))} iyi bir iş çıkardın. ${focus} ölçütünü geliştirerek bir üst seviyeye çıkabilirsin: ${hint}`;
  }
  return `${firstName}, görevin büyük bölümünü başarıyla tamamladın. ${focus} ölçütünü geliştirerek bir üst seviyeye çıkabilirsin: ${hint}`;
}
