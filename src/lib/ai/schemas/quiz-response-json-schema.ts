import {
  JSON_BOS_OLABILIR_METIN,
  JSON_METIN,
  JSON_TAM_SAYI,
  jsonDizi,
  jsonNesne,
  jsonSecim,
  type JsonSemasi,
} from "@/lib/quiz-generator/gorsel-sorular/ortak";
import { gorevTanimi } from "@/lib/quiz-generator/gorsel-sorular/tanimlar";
import type { QuizBlueprint } from "@/types/quiz-blueprint";
import type { QuestionType } from "@/types/quiz-generator";

const ID_METIN = jsonNesne({ id: JSON_METIN, text: JSON_METIN });
const METIN_DIZISI = jsonDizi(JSON_METIN);
const BOS_OLABILIR_SAYI: JsonSemasi = { type: ["number", "null"] };

/**
 * Shared fields, in the order the model writes them: the explanation comes
 * before the answer fields so the model solves the question first and then
 * marks the answer (a cheap, reliable accuracy gain for arithmetic).
 */
function klasikSoru(type: QuestionType, alanlar: Record<string, JsonSemasi>): JsonSemasi {
  return jsonNesne({
    type: jsonSecim([type]),
    prompt: JSON_METIN,
    answerExplanation: JSON_BOS_OLABILIR_METIN,
    ...alanlar,
    points: BOS_OLABILIR_SAYI,
  });
}

const KLASIK_SORU_SEMALARI: Record<Exclude<QuestionType, "gorselSoru">, JsonSemasi> = {
  multipleChoice: klasikSoru("multipleChoice", { options: jsonDizi(ID_METIN), correctOptionId: JSON_METIN }),
  trueFalse: klasikSoru("trueFalse", { correctAnswer: { type: "boolean" } }),
  shortAnswer: klasikSoru("shortAnswer", { acceptableAnswers: METIN_DIZISI }),
  fillInBlank: klasikSoru("fillInBlank", {
    textWithBlanks: JSON_METIN,
    blanks: jsonDizi(jsonNesne({ index: JSON_TAM_SAYI, acceptableAnswers: METIN_DIZISI })),
  }),
  matching: klasikSoru("matching", {
    leftItems: jsonDizi(ID_METIN),
    rightItems: jsonDizi(ID_METIN),
    correctPairs: jsonDizi(jsonNesne({ leftId: JSON_METIN, rightId: JSON_METIN })),
  }),
  ordering: klasikSoru("ordering", { items: jsonDizi(ID_METIN), correctOrder: METIN_DIZISI }),
  openEnded: klasikSoru("openEnded", {
    sampleAnswer: JSON_METIN,
    gradingCriteria: { type: ["array", "null"], items: JSON_METIN },
  }),
};

/**
 * Builds an OpenAI structured-outputs (strict) JSON Schema for the response
 * to one blueprint (or one batch of it). Strict mode enforces field names,
 * required fields and enum values (e.g. card colors, claim types) at
 * generation time, so those can no longer fail validation.
 *
 * Returns `null` when the plan contains a classic `visual` slot: visual
 * `data` is intentionally free-form per visual type and can't be expressed
 * in strict mode, so those batches fall back to plain JSON mode. Semantic
 * checks (correct answer, uniqueness, …) always stay in the validator —
 * a schema can't express them.
 */
export function buildQuizResponseJsonSchema(blueprint: QuizBlueprint): JsonSemasi | null {
  if (blueprint.slots.some((slot) => slot.visualType !== "none")) return null;

  const klasikTurler = Array.from(new Set(blueprint.slots.map((slot) => slot.type))).filter(
    (tur): tur is Exclude<QuestionType, "gorselSoru"> => tur !== "gorselSoru"
  );
  // Visual questions: exactly the tip/task pairs the plan assigns here.
  const planAnahtarlari = new Set<string>();
  const gorselSemalar = blueprint.slots.flatMap((slot) => {
    const plan = slot.gorselPlani;
    if (!plan || planAnahtarlari.has(`${plan.tip}|${plan.gorev}`)) return [];
    planAnahtarlari.add(`${plan.tip}|${plan.gorev}`);
    return [jsonNesne({ tip: jsonSecim([plan.tip]), veri: gorevTanimi(plan).jsonSemasi })];
  });
  const secenekler = [...klasikTurler.map((tur) => KLASIK_SORU_SEMALARI[tur]), ...gorselSemalar];

  return jsonNesne({
    title: JSON_METIN,
    questions: jsonDizi(secenekler.length === 1 ? secenekler[0] : { anyOf: secenekler }),
  });
}
