import { projectPackForQuizGenerator } from "@/lib/knowledge/projections/knowledge-pack-projections";
import type { QuizPackResolutionOutcome } from "@/lib/knowledge/registry/resolve-pack-for-quiz";
import { COGNITIVE_LEVELS } from "@/types/quiz-generator";
import type { CognitiveLevel } from "@/types/quiz-generator";
import type { KnowledgePackQuestionPattern, QuizGeneratorPackProjection } from "@/types/knowledge-pack";
import type { QuestionBlueprintSlot } from "@/types/quiz-blueprint";

const COGNITIVE_RANK: Record<CognitiveLevel, number> = Object.fromEntries(
  COGNITIVE_LEVELS.map((level, index) => [level, index])
) as Record<CognitiveLevel, number>;

export type CompatibilityTier = 1 | 2 | 3;

/**
 * Deterministic slot/pattern compatibility, in strictly decreasing quality:
 *  1. type + exact cognitive-level membership + exact approach membership
 *  2. type + exact cognitive-level membership (approach dropped)
 *  3. type + the slot's level falls WITHIN the pattern's supported range
 *     (min..max), without exact membership — bidirectional: this rejects a
 *     pattern that is too advanced for the slot AND one that is too weak for
 *     it. Exact-membership tiers (1/2) always outrank this range check.
 *  null. incompatible — never assigned, never forced.
 */
export function computeCompatibilityTier(
  slot: QuestionBlueprintSlot,
  pattern: KnowledgePackQuestionPattern
): CompatibilityTier | null {
  const typeCompatible = !pattern.suitableQuestionTypes || pattern.suitableQuestionTypes.includes(slot.type);
  if (!typeCompatible) return null;

  const exactLevelMatch = pattern.suitableCognitiveLevels.includes(slot.cognitiveLevel);
  const exactApproachMatch = pattern.suitableApproaches.includes(slot.approach);

  if (exactLevelMatch && exactApproachMatch) return 1;
  if (exactLevelMatch) return 2;

  const ranks = pattern.suitableCognitiveLevels.map((level) => COGNITIVE_RANK[level]);
  const minRank = Math.min(...ranks);
  const maxRank = Math.max(...ranks);
  const slotRank = COGNITIVE_RANK[slot.cognitiveLevel];
  if (slotRank >= minRank && slotRank <= maxRank) return 3;

  return null;
}

export interface SlotPatternAssignment {
  slotIndex: number;
  pattern?: KnowledgePackQuestionPattern;
  tier?: CompatibilityTier;
}

export interface PatternCoverageResult {
  /** One entry per slot, in slot order. `pattern` is undefined when no compatible pattern exists (never forced). */
  assignments: SlotPatternAssignment[];
  /** ids of patterns that ended up covering at least one slot. */
  coveredPatternIds: string[];
  /** ids of patterns with zero compatible slots anywhere in this blueprint. */
  uncoveredPatternIds: string[];
}

interface CompatibilityEdge {
  slotIndex: number;
  tier: CompatibilityTier;
}

/**
 * Stage 1: deterministic maximum-cardinality bipartite matching between
 * distinct question patterns and compatible slots (Kuhn's augmenting-path
 * algorithm), so a pattern with only one compatible slot is never starved by
 * a pattern that could have used a different slot instead. Layered by tier
 * (tier-1-only first, then tier-1+2, then all tiers) so the algorithm
 * exhausts better-tier possibilities before ever using a weaker one, without
 * ever reducing the final cardinality. Pack pattern order and slot index are
 * the only tie-breaks — fully pack-agnostic, no topic-specific knowledge.
 *
 * Stage 2 then fills every still-unassigned slot with its best-available
 * compatible pattern, balancing repeats by preferring the least-used pattern
 * among equally-good candidates. A slot with no compatible pattern at any
 * tier is left unassigned — never forced.
 */
export function computeQuestionPatternCoverage(
  slots: QuestionBlueprintSlot[],
  patterns: KnowledgePackQuestionPattern[]
): PatternCoverageResult {
  const edgesByPattern: CompatibilityEdge[][] = patterns.map((pattern) =>
    slots
      .map((slot, slotIndex) => ({ slotIndex, tier: computeCompatibilityTier(slot, pattern) }))
      .filter((edge): edge is CompatibilityEdge => edge.tier !== null)
  );

  const slotOwner = new Map<number, number>();
  const patternMatch = new Map<number, { slotIndex: number; tier: CompatibilityTier }>();

  function tryMatch(patternIndex: number, allowedTiers: ReadonlySet<CompatibilityTier>, visited: Set<number>): boolean {
    for (const edge of edgesByPattern[patternIndex]) {
      if (!allowedTiers.has(edge.tier) || visited.has(edge.slotIndex)) continue;
      visited.add(edge.slotIndex);
      const currentOwner = slotOwner.get(edge.slotIndex);
      if (currentOwner === undefined || tryMatch(currentOwner, allowedTiers, visited)) {
        slotOwner.set(edge.slotIndex, patternIndex);
        patternMatch.set(patternIndex, { slotIndex: edge.slotIndex, tier: edge.tier });
        return true;
      }
    }
    return false;
  }

  const tierPasses: ReadonlySet<CompatibilityTier>[] = [new Set([1]), new Set([1, 2]), new Set([1, 2, 3])];
  for (const allowedTiers of tierPasses) {
    patterns.forEach((_, patternIndex) => {
      if (patternMatch.has(patternIndex)) return;
      tryMatch(patternIndex, allowedTiers, new Set());
    });
  }

  const assignments: SlotPatternAssignment[] = slots.map((_, slotIndex) => ({ slotIndex }));
  patternMatch.forEach((match, patternIndex) => {
    assignments[match.slotIndex] = { slotIndex: match.slotIndex, pattern: patterns[patternIndex], tier: match.tier };
  });

  const usageCount = new Map<number, number>();
  patternMatch.forEach((_, patternIndex) => usageCount.set(patternIndex, 1));

  assignments.forEach((assignment, slotIndex) => {
    if (assignment.pattern) return;
    const slot = slots[slotIndex];
    let best: { patternIndex: number; tier: CompatibilityTier } | undefined;

    patterns.forEach((pattern, patternIndex) => {
      const tier = computeCompatibilityTier(slot, pattern);
      if (tier === null) return;
      const currentUsage = usageCount.get(patternIndex) ?? 0;
      const bestUsage = best ? (usageCount.get(best.patternIndex) ?? 0) : Infinity;
      if (!best || tier < best.tier || (tier === best.tier && currentUsage < bestUsage)) {
        best = { patternIndex, tier };
      }
    });

    if (best) {
      assignments[slotIndex] = { slotIndex, pattern: patterns[best.patternIndex], tier: best.tier };
      usageCount.set(best.patternIndex, (usageCount.get(best.patternIndex) ?? 0) + 1);
    }
  });

  const coveredPatternIds = patterns.filter((_, index) => patternMatch.has(index)).map((pattern) => pattern.id);
  const uncoveredPatternIds = patterns.filter((_, index) => !patternMatch.has(index)).map((pattern) => pattern.id);

  return { assignments, coveredPatternIds, uncoveredPatternIds };
}

export type KnowledgePackVerificationMode = "verified" | "draftPreview";

export interface QuizGeneratorPackContext {
  projection: QuizGeneratorPackProjection;
  verificationMode: KnowledgePackVerificationMode;
}

/**
 * One global block summarizing the pack's verified (or, if in draft
 * preview, explicitly NOT-yet-verified) facts. Never labels draft content as
 * verified knowledge — the heading and framing sentence both change with
 * `verificationMode`.
 */
export function buildKnowledgePackOverviewBlock(context: QuizGeneratorPackContext): string {
  const { projection, verificationMode } = context;

  const heading =
    verificationMode === "verified"
      ? "DOĞRULANMIŞ BİLGİ PAKETİ (VERIFIED KNOWLEDGE PACK)"
      : "TASLAK BİLGİ PAKETİ — İNSAN İNCELEMESİ GEREKLİDİR (DRAFT KNOWLEDGE PACK — HUMAN REVIEW REQUIRED)";

  const statusNote =
    verificationMode === "verified"
      ? "Aşağıdaki bilgiler resmî kaynaklarla doğrulanmıştır; öğretmenin serbest metin hedeflerinden ÖNCE gelen, " +
        "geçersiz kılınamayacak gerçekler olarak ele al."
      : "Aşağıdaki bilgiler HENÜZ resmî olarak doğrulanmamış bir taslaktır (insan incelemesi bekleniyor). En iyi " +
        "bilinen pedagojik kaynak olarak kullan, ancak bunu kesinleşmiş/doğrulanmış resmî bilgi gibi sunma.";

  return [
    `${heading}:`,
    statusNote,
    `Öğrenme çıktıları: ${projection.learningOutcomes.map((o) => o.statement).join(" | ")}`,
    `Ölçülebilir beceriler: ${projection.assessableSkills.join(" | ")}`,
    `Zorluk ilerlemesi: ${projection.difficultyRules.progressionNotes}`,
    `Kesinlikle kaçın: ${projection.forbiddenPatterns.join(" | ")}`,
  ].join("\n");
}

/**
 * Renders one slot's assigned pattern as a self-contained, non-negotiable
 * guidance block meant to sit DIRECTLY under that slot's own SORU PLANI
 * line — never in a separate trailing section, so it never has to compete
 * with the rest of a long prompt for the model's attention.
 *
 * Every bullet is derived from the pattern's own authored fields
 * (`description`, `requiredInformation`, `reasoningSteps`, `avoid`,
 * `targetedMisconceptionIds`) — nothing here is specific to Ratio and
 * Proportion or hardcoded per pattern id. The specificity a reviewer sees
 * (e.g. a scale pattern demanding a drawing/real-distance conversion, an
 * inverse-proportion pattern demanding a constant-product relation, an
 * error-analysis pattern demanding two solutions) comes entirely from how
 * that pattern's own `description` was authored in the pack, not from
 * pattern-specific code here.
 *
 * Returns `undefined` for an unassigned slot — silence, never a placeholder.
 */
export function buildSlotPatternGuidanceText(
  assignment: SlotPatternAssignment,
  projection: QuizGeneratorPackProjection
): string | undefined {
  const pattern = assignment.pattern;
  if (!pattern) return undefined;

  const misconceptions = pattern.targetedMisconceptionIds
    .map((id) => projection.commonMisconceptions.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  const lines = [
    `   [BİLGİ PAKETİ DESENİ ${pattern.id}] "${pattern.name}"`,
    `   Zorunlu kavram: ${pattern.description}`,
    "   Açıklamada birden fazla unsur/çözüm/durum isteniyorsa HER BİRİNİ ayrı ve somut biçimde göster; tek bir " +
      "özetle veya tek bir sonuçla geçiştirme. Yalnızca konu adını taşıyan genel bir oran/orantı sorusu olamaz.",
    `   Gerekli bilgi: ${pattern.requiredInformation.join("; ")}`,
    `   Adımlar: ${pattern.reasoningSteps.join(" → ")}`,
  ];
  if (pattern.recommendedVisuals.length > 0) {
    lines.push(`   Görsel (gerekliyse): ${pattern.recommendedVisuals.join(", ")}`);
  }
  if (misconceptions.length > 0) {
    lines.push(`   Hedef yanılgı: ${misconceptions.map((m) => `${m.description} (Doğrusu: ${m.correction})`).join(" | ")}`);
  }
  if (pattern.avoid.length > 0) {
    lines.push(`   Kaçın: ${pattern.avoid.join("; ")}`);
  }
  lines.push("   Döndürmeden önce doğrula: yukarıdaki kavram ve adımlar tam sağlanıyor mu? Sağlanmıyorsa yeniden yaz.");

  return lines.join("\n");
}

/**
 * Generic, pattern-agnostic self-check the model must run silently before
 * returning JSON. Refers to "atanmış desen" (assigned pattern) in the
 * abstract — it never names a specific pattern, so it applies unchanged to
 * any future pack.
 */
export function buildKnowledgePackSelfCheckBlock(): string {
  return [
    "BİLGİ PAKETİ ÖZ-KONTROLÜ (ZORUNLU — JSON döndürmeden önce her soru için sessizce uygula):",
    "Desen atanmış her soru için: (1) içerik desenin kavramıyla örtüşüyor mu, (2) desen birden fazla unsur/çözüm " +
      "istiyorsa hepsi ayrı ayrı gösterilmiş mi, (3) çözüm desenin adımlarını izliyor mu, (4) gerekli bilgi eksik " +
      "mi, (5) soru sıradan/genel bir oran-orantı sorusuna mı dönüşmüş. Olumsuzsa yazmadan önce sessizce düzelt.",
  ].join("\n");
}

/**
 * Turns a `QuizPackResolutionOutcome` into the `QuizGeneratorPackContext`
 * `buildQuizPrompt` accepts, or `undefined` for every outcome that must not
 * reach the Prompt Builder (`inactive`, `notFound`, `invalid`, `ambiguous`).
 * The single place that decides "does this resolution result get used",
 * kept out of the API route so it's testable without Next's request/response
 * machinery.
 */
export function deriveQuizPackContext(outcome: QuizPackResolutionOutcome): QuizGeneratorPackContext | undefined {
  if (outcome.mode === "resolvedVerified") {
    return { projection: projectPackForQuizGenerator(outcome.pack), verificationMode: "verified" };
  }
  if (outcome.mode === "resolvedDraftPreview") {
    return { projection: projectPackForQuizGenerator(outcome.pack), verificationMode: "draftPreview" };
  }
  return undefined;
}
