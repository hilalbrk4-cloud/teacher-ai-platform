import { createQuizGeneratorId } from "@/lib/quiz-generator/id";
import type { QuestionBlueprintSlot, QuizBlueprint } from "@/types/quiz-blueprint";
import type {
  FillInBlankQuestion,
  MatchingQuestion,
  MultipleChoiceQuestion,
  OpenEndedQuestion,
  OrderingQuestion,
  Quiz,
  QuizQuestion,
  QuizVisual,
  QuestionType,
  ShortAnswerQuestion,
  TrueFalseQuestion,
  VisualType,
} from "@/types/quiz-generator";

/**
 * Machine-readable description of every question type. Single source of
 * truth: the Prompt Builder uses it to tell the AI exactly which
 * type-specific fields to return for each blueprint slot, and the
 * validator below uses the same `key`s to dispatch structural checks.
 */
export interface QuizQuestionTypeMeta {
  key: QuestionType;
  label: string;
  description: string;
  aiFields: string;
}

export const QUIZ_QUESTION_TYPE_METADATA: readonly QuizQuestionTypeMeta[] = [
  {
    key: "multipleChoice",
    label: "Çoktan seçmeli",
    description: "Birden fazla seçenek arasından tek doğru cevabın seçildiği soru.",
    aiFields:
      '"options" (en az 3 öğeli dizi, her öğe {"id","text"}) ve "correctOptionId" ' +
      '("options" içindeki bir "id" değeriyle birebir eşleşmeli).',
  },
  {
    key: "trueFalse",
    label: "Doğru / Yanlış",
    description: "Bir önermenin doğru mu yanlış mı olduğunun belirlendiği soru.",
    aiFields: '"correctAnswer" (true veya false, boolean).',
  },
  {
    key: "shortAnswer",
    label: "Kısa cevap",
    description: "Kısa, serbest metinle yanıtlanan soru.",
    aiFields: '"acceptableAnswers" (en az 1 öğeli, kabul edilebilir cevapları içeren metin dizisi).',
  },
  {
    key: "fillInBlank",
    label: "Boşluk doldurma",
    description: "Cümle içindeki boşlukların doldurulduğu soru.",
    aiFields:
      '"textWithBlanks" (boşlukların {{1}}, {{2}} şeklinde işaretlendiği metin) ve "blanks" ' +
      '(dizi; her öğe {"index","acceptableAnswers"}).',
  },
  {
    key: "matching",
    label: "Eşleştirme",
    description: "Sol ve sağ sütundaki öğelerin eşleştirildiği soru.",
    aiFields:
      '"leftItems" ve "rightItems" (her biri {"id","text"} dizisi) ile "correctPairs" ' +
      '(dizi; her öğe {"leftId","rightId"}; her "leftId" tam olarak bir kez kullanılmalı).',
  },
  {
    key: "ordering",
    label: "Sıralama",
    description: "Öğelerin doğru sıraya konulduğu soru.",
    aiFields: '"items" ({"id","text"} dizisi) ve "correctOrder" ("items" id\'lerinin doğru sıradaki bir permütasyonu).',
  },
  {
    key: "openEnded",
    label: "Açık uçlu",
    description: "Öğrencinin kendi cümleleriyle yanıtladığı, tek doğru cevabı olmayan soru.",
    aiFields: '"sampleAnswer" (örnek/model bir cevap) ve isteğe bağlı "gradingCriteria" (metin dizisi).',
  },
];

const QUESTION_TYPE_KEYS = new Set(QUIZ_QUESTION_TYPE_METADATA.map((meta) => meta.key));

/** Same "single source of truth" pattern, for visual types. */
export interface QuizVisualTypeMeta {
  key: VisualType;
  label: string;
  description: string;
  dataShape: string;
}

export const QUIZ_VISUAL_TYPE_METADATA: readonly QuizVisualTypeMeta[] = [
  {
    key: "graph",
    label: "Grafik",
    description: "Sayısal ilişkileri gösteren bir grafik.",
    dataShape: '{"chartType","xLabel","yLabel","series":[{"label","points":[{"x","y"}]}]}',
  },
  {
    key: "table",
    label: "Tablo",
    description: "Satır ve sütunlardan oluşan bir veri tablosu.",
    dataShape: '{"columns":[string], "rows":[[string]]}',
  },
  {
    key: "numberLine",
    label: "Sayı doğrusu",
    description: "Değerlerin işaretlendiği bir sayı doğrusu.",
    dataShape: '{"min","max","step","markers":[{"value","label"}]}',
  },
  {
    key: "fractionModel",
    label: "Kesir modeli",
    description: "Bir kesri görsel olarak temsil eden model (ör. dilimlenmiş şekil).",
    dataShape: '{"numerator","denominator","shape"}',
  },
  {
    key: "geometryDiagram",
    label: "Geometri şeması",
    description: "Bir geometrik şekli veya ilişkisini gösteren şema.",
    dataShape: "Şeklin çözüm için gerekli tüm ölçü/etiketlerini içeren serbest yapı.",
  },
  {
    key: "coordinatePlane",
    label: "Koordinat düzlemi",
    description: "Noktaların veya şekillerin işaretlendiği koordinat düzlemi.",
    dataShape: '{"points":[{"x","y","label"}]}',
  },
  {
    key: "scientificDiagram",
    label: "Bilimsel şema",
    description: "Bir bilimsel kavramı veya yapıyı gösteren şema.",
    dataShape: "Şemanın çözüm için gerekli etiket/bölümlerini içeren serbest yapı.",
  },
  {
    key: "experimentSetup",
    label: "Deney düzeneği",
    description: "Bir deney düzeneğini ve değişkenlerini gösteren şema.",
    dataShape: "Düzeneğin bileşenlerini ve değişkenlerini içeren serbest yapı.",
  },
  {
    key: "flowChart",
    label: "Akış şeması",
    description: "Adımlar arasındaki sırayı/ilişkiyi gösteren akış şeması.",
    dataShape: '{"steps":[string]}',
  },
  {
    key: "lifeCycleDiagram",
    label: "Yaşam döngüsü şeması",
    description: "Bir canlının yaşam döngüsü evrelerini gösteren şema.",
    dataShape: '{"stages":[string]}',
  },
  {
    key: "foodChain",
    label: "Besin zinciri",
    description: "Bir besin zincirini veya ağını gösteren şema.",
    dataShape: '{"links":[string]}',
  },
  {
    key: "measurementTool",
    label: "Ölçüm aracı",
    description: "Bir cetvel, terazi, termometre gibi ölçüm aracının okunduğu görsel.",
    dataShape: "Aracın okunacak değerini/ölçeğini içeren serbest yapı.",
  },
  {
    key: "customSvg",
    label: "Özel şema",
    description: "Yukarıdaki kategorilere birebir uymayan, konuya özel bir şema.",
    dataShape: "Sorunun çözümü için gerekli bilgiyi içeren serbest yapı.",
  },
];

export interface QuizValidationIssue {
  path: string;
  message: string;
}

export type QuizValidationResult =
  | { success: true; data: Quiz; issues: [] }
  | { success: false; data?: undefined; issues: QuizValidationIssue[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(
  record: Record<string, unknown>,
  field: string,
  path: string,
  issues: QuizValidationIssue[]
): string | undefined {
  const value = record[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path: `${path}.${field}`, message: `"${field}" boş olmayan bir metin (string) olmalıdır.` });
    return undefined;
  }
  return value;
}

function readOptionalString(record: Record<string, unknown>, field: string): string | undefined {
  const value = record[field];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readOptionalPositiveNumber(
  record: Record<string, unknown>,
  field: string,
  path: string,
  issues: QuizValidationIssue[]
): number | undefined {
  const value = record[field];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    issues.push({ path: `${path}.${field}`, message: `"${field}" belirtilirse pozitif bir sayı olmalıdır.` });
    return undefined;
  }
  return value;
}

function readIdTextItems(
  value: unknown,
  path: string,
  issues: QuizValidationIssue[]
): { id: string; text: string }[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push({ path, message: `"${path}" boş olmayan bir dizi olmalıdır.` });
    return undefined;
  }

  const items: { id: string; text: string }[] = [];
  const seenIds = new Set<string>();
  let ok = true;

  value.forEach((item, index) => {
    if (!isRecord(item)) {
      issues.push({ path: `${path}[${index}]`, message: "Her öğe bir JSON nesnesi olmalıdır." });
      ok = false;
      return;
    }
    const id = readNonEmptyString(item, "id", `${path}[${index}]`, issues);
    const text = readNonEmptyString(item, "text", `${path}[${index}]`, issues);
    if (!id || !text) {
      ok = false;
      return;
    }
    if (seenIds.has(id)) {
      issues.push({ path: `${path}[${index}].id`, message: `Tekrarlanan id: ${id}` });
      ok = false;
      return;
    }
    seenIds.add(id);
    items.push({ id, text });
  });

  return ok ? items : undefined;
}

/**
 * Minimal, per-visual-type sanity checks — deep enough to catch an empty
 * or structurally useless visual, not a full geometry/graph validator.
 * Scope intentionally narrow (see architecture plan, Risk #4); extend a
 * single type's check here as its renderer is built, without touching the
 * others.
 */
function validateVisualData(
  visualType: VisualType,
  data: Record<string, unknown>,
  path: string,
  issues: QuizValidationIssue[]
): boolean {
  switch (visualType) {
    case "graph": {
      const series = data.series;
      if (!Array.isArray(series) || series.length === 0) {
        issues.push({ path: `${path}.data.series`, message: '"series" boş olmayan bir dizi olmalıdır.' });
        return false;
      }
      return true;
    }
    case "table": {
      const columns = data.columns;
      const rows = data.rows;
      if (!Array.isArray(columns) || columns.length === 0) {
        issues.push({ path: `${path}.data.columns`, message: '"columns" boş olmayan bir dizi olmalıdır.' });
        return false;
      }
      if (!Array.isArray(rows) || rows.length === 0) {
        issues.push({ path: `${path}.data.rows`, message: '"rows" boş olmayan bir dizi olmalıdır.' });
        return false;
      }
      return true;
    }
    case "numberLine": {
      if (typeof data.min !== "number" || typeof data.max !== "number") {
        issues.push({ path: `${path}.data`, message: '"min" ve "max" sayı olmalıdır.' });
        return false;
      }
      return true;
    }
    default: {
      // Remaining visual types get a shallow "non-empty data object" check
      // for v1 — see architecture plan for the rationale.
      if (Object.keys(data).length === 0) {
        issues.push({ path: `${path}.data`, message: '"data" boş olmayan bir nesne olmalıdır.' });
        return false;
      }
      return true;
    }
  }
}

function validateVisual(
  value: unknown,
  path: string,
  issues: QuizValidationIssue[]
): QuizVisual | undefined {
  if (!isRecord(value)) {
    issues.push({ path, message: `"${path}" bir JSON nesnesi olmalıdır.` });
    return undefined;
  }

  const type = value.type;
  if (typeof type !== "string" || !QUIZ_VISUAL_TYPE_METADATA.some((meta) => meta.key === type)) {
    issues.push({ path: `${path}.type`, message: `Geçersiz görsel türü: ${String(type)}` });
    return undefined;
  }
  const visualType = type as VisualType;

  const altText = readNonEmptyString(value, "altText", path, issues);
  const data = value.data;
  if (!isRecord(data)) {
    issues.push({ path: `${path}.data`, message: '"data" bir JSON nesnesi olmalıdır.' });
    return undefined;
  }
  if (!altText) return undefined;
  if (!validateVisualData(visualType, data, path, issues)) return undefined;

  return {
    type: visualType,
    title: readOptionalString(value, "title"),
    data,
    altText,
  };
}

interface CommonFields {
  prompt: string;
  visual?: QuizVisual;
  points?: number;
  answerExplanation?: string;
}

function readCommonFields(
  record: Record<string, unknown>,
  slot: QuestionBlueprintSlot,
  path: string,
  issues: QuizValidationIssue[]
): CommonFields | undefined {
  const prompt = readNonEmptyString(record, "prompt", path, issues);
  const points = readOptionalPositiveNumber(record, "points", path, issues);
  const answerExplanation = readOptionalString(record, "answerExplanation");

  let visual: QuizVisual | undefined;
  if (slot.visualType !== "none") {
    if (record.visual === undefined) {
      issues.push({
        path: `${path}.visual`,
        message: `Bu soru için bir "${slot.visualType}" görseli bekleniyor ama "visual" alanı eksik.`,
      });
      return undefined;
    }
    visual = validateVisual(record.visual, `${path}.visual`, issues);
    if (!visual) return undefined;
    if (visual.type !== slot.visualType) {
      issues.push({
        path: `${path}.visual.type`,
        message: `Beklenen görsel türü "${slot.visualType}" ama "${visual.type}" döndürüldü.`,
      });
      return undefined;
    }
  }

  if (!prompt) return undefined;
  return { prompt, visual, points, answerExplanation };
}

type TypedQuestionFields =
  | { type: "multipleChoice"; fields: Omit<MultipleChoiceQuestion, "id" | "audit" | keyof CommonFields> }
  | { type: "trueFalse"; fields: Omit<TrueFalseQuestion, "id" | "audit" | keyof CommonFields> }
  | { type: "shortAnswer"; fields: Omit<ShortAnswerQuestion, "id" | "audit" | keyof CommonFields> }
  | { type: "fillInBlank"; fields: Omit<FillInBlankQuestion, "id" | "audit" | keyof CommonFields> }
  | { type: "matching"; fields: Omit<MatchingQuestion, "id" | "audit" | keyof CommonFields> }
  | { type: "ordering"; fields: Omit<OrderingQuestion, "id" | "audit" | keyof CommonFields> }
  | { type: "openEnded"; fields: Omit<OpenEndedQuestion, "id" | "audit" | keyof CommonFields> };

function validateMultipleChoice(
  record: Record<string, unknown>,
  path: string,
  issues: QuizValidationIssue[]
): TypedQuestionFields["fields"] | undefined {
  const options = readIdTextItems(record.options, `${path}.options`, issues);
  const correctOptionId = readNonEmptyString(record, "correctOptionId", path, issues);
  if (!options || options.length < 3 || !correctOptionId) {
    if (options && options.length < 3) {
      issues.push({ path: `${path}.options`, message: '"options" en az 3 öğe içermelidir.' });
    }
    return undefined;
  }
  if (!options.some((option) => option.id === correctOptionId)) {
    issues.push({
      path: `${path}.correctOptionId`,
      message: `"correctOptionId" (${correctOptionId}) "options" içindeki bir id ile eşleşmiyor.`,
    });
    return undefined;
  }
  return { type: "multipleChoice", options, correctOptionId };
}

function validateTrueFalse(
  record: Record<string, unknown>,
  path: string,
  issues: QuizValidationIssue[]
): TypedQuestionFields["fields"] | undefined {
  const value = record.correctAnswer;
  if (typeof value !== "boolean") {
    issues.push({ path: `${path}.correctAnswer`, message: '"correctAnswer" true veya false olmalıdır.' });
    return undefined;
  }
  return { type: "trueFalse", correctAnswer: value };
}

function validateShortAnswer(
  record: Record<string, unknown>,
  path: string,
  issues: QuizValidationIssue[]
): TypedQuestionFields["fields"] | undefined {
  const value = record.acceptableAnswers;
  if (!Array.isArray(value) || value.length === 0 || !value.every((item) => typeof item === "string" && item.trim())) {
    issues.push({
      path: `${path}.acceptableAnswers`,
      message: '"acceptableAnswers" boş olmayan bir metin dizisi olmalıdır.',
    });
    return undefined;
  }
  return { type: "shortAnswer", acceptableAnswers: value as string[] };
}

function validateFillInBlank(
  record: Record<string, unknown>,
  path: string,
  issues: QuizValidationIssue[]
): TypedQuestionFields["fields"] | undefined {
  const textWithBlanks = readNonEmptyString(record, "textWithBlanks", path, issues);
  const rawBlanks = record.blanks;
  if (!Array.isArray(rawBlanks) || rawBlanks.length === 0) {
    issues.push({ path: `${path}.blanks`, message: '"blanks" boş olmayan bir dizi olmalıdır.' });
    return undefined;
  }

  const blanks: { index: number; acceptableAnswers: string[] }[] = [];
  let ok = true;
  rawBlanks.forEach((item, itemIndex) => {
    if (!isRecord(item) || typeof item.index !== "number") {
      issues.push({ path: `${path}.blanks[${itemIndex}]`, message: '"index" bir sayı olmalıdır.' });
      ok = false;
      return;
    }
    const answers = item.acceptableAnswers;
    if (!Array.isArray(answers) || answers.length === 0 || !answers.every((a) => typeof a === "string" && a.trim())) {
      issues.push({
        path: `${path}.blanks[${itemIndex}].acceptableAnswers`,
        message: '"acceptableAnswers" boş olmayan bir metin dizisi olmalıdır.',
      });
      ok = false;
      return;
    }
    blanks.push({ index: item.index, acceptableAnswers: answers as string[] });
  });

  if (!textWithBlanks || !ok) return undefined;
  return { type: "fillInBlank", textWithBlanks, blanks };
}

function validateMatching(
  record: Record<string, unknown>,
  path: string,
  issues: QuizValidationIssue[]
): TypedQuestionFields["fields"] | undefined {
  const leftItems = readIdTextItems(record.leftItems, `${path}.leftItems`, issues);
  const rightItems = readIdTextItems(record.rightItems, `${path}.rightItems`, issues);
  const rawPairs = record.correctPairs;

  if (!leftItems || !rightItems) return undefined;
  if (!Array.isArray(rawPairs) || rawPairs.length === 0) {
    issues.push({ path: `${path}.correctPairs`, message: '"correctPairs" boş olmayan bir dizi olmalıdır.' });
    return undefined;
  }

  const leftIds = new Set(leftItems.map((item) => item.id));
  const rightIds = new Set(rightItems.map((item) => item.id));
  const pairs: { leftId: string; rightId: string }[] = [];
  const coveredLeftIds = new Set<string>();
  let ok = true;

  rawPairs.forEach((pair, index) => {
    if (!isRecord(pair) || typeof pair.leftId !== "string" || typeof pair.rightId !== "string") {
      issues.push({ path: `${path}.correctPairs[${index}]`, message: '"leftId" ve "rightId" metin olmalıdır.' });
      ok = false;
      return;
    }
    if (!leftIds.has(pair.leftId) || !rightIds.has(pair.rightId)) {
      issues.push({
        path: `${path}.correctPairs[${index}]`,
        message: '"leftId"/"rightId" değerleri leftItems/rightItems id\'leriyle eşleşmiyor.',
      });
      ok = false;
      return;
    }
    coveredLeftIds.add(pair.leftId);
    pairs.push({ leftId: pair.leftId, rightId: pair.rightId });
  });

  if (!ok) return undefined;
  if (coveredLeftIds.size !== leftIds.size) {
    issues.push({ path: `${path}.correctPairs`, message: "Her \"leftItems\" öğesi tam olarak bir kez eşleştirilmelidir." });
    return undefined;
  }

  return { type: "matching", leftItems, rightItems, correctPairs: pairs };
}

function validateOrdering(
  record: Record<string, unknown>,
  path: string,
  issues: QuizValidationIssue[]
): TypedQuestionFields["fields"] | undefined {
  const items = readIdTextItems(record.items, `${path}.items`, issues);
  const correctOrder = record.correctOrder;

  if (!items) return undefined;
  if (!Array.isArray(correctOrder) || correctOrder.length !== items.length) {
    issues.push({
      path: `${path}.correctOrder`,
      message: '"correctOrder", "items" ile aynı uzunlukta bir dizi olmalıdır.',
    });
    return undefined;
  }

  const itemIds = new Set(items.map((item) => item.id));
  const seen = new Set<string>();
  for (const id of correctOrder) {
    if (typeof id !== "string" || !itemIds.has(id) || seen.has(id)) {
      issues.push({
        path: `${path}.correctOrder`,
        message: '"correctOrder", "items" id\'lerinin tekrarsız bir permütasyonu olmalıdır.',
      });
      return undefined;
    }
    seen.add(id);
  }

  return { type: "ordering", items, correctOrder: correctOrder as string[] };
}

function validateOpenEnded(
  record: Record<string, unknown>,
  path: string,
  issues: QuizValidationIssue[]
): TypedQuestionFields["fields"] | undefined {
  const sampleAnswer = readNonEmptyString(record, "sampleAnswer", path, issues);
  if (!sampleAnswer) return undefined;

  const rawCriteria = record.gradingCriteria;
  let gradingCriteria: string[] | undefined;
  if (rawCriteria !== undefined) {
    if (!Array.isArray(rawCriteria) || !rawCriteria.every((item) => typeof item === "string" && item.trim())) {
      issues.push({ path: `${path}.gradingCriteria`, message: '"gradingCriteria" belirtilirse bir metin dizisi olmalıdır.' });
      return undefined;
    }
    gradingCriteria = rawCriteria as string[];
  }

  return { type: "openEnded", sampleAnswer, gradingCriteria };
}

const TYPE_VALIDATORS: Record<
  QuestionType,
  (record: Record<string, unknown>, path: string, issues: QuizValidationIssue[]) => TypedQuestionFields["fields"] | undefined
> = {
  multipleChoice: validateMultipleChoice,
  trueFalse: validateTrueFalse,
  shortAnswer: validateShortAnswer,
  fillInBlank: validateFillInBlank,
  matching: validateMatching,
  ordering: validateOrdering,
  openEnded: validateOpenEnded,
};

/**
 * Validates one raw question against the blueprint slot it must fulfill.
 * A `type` mismatch against the slot is a hard failure — the blueprint is
 * the single source of truth, so the AI does not get to reinterpret it.
 * On success, returns a fully-typed `QuizQuestion` with a fresh `id` and an
 * `audit` object copied from the slot (never parsed from the AI response).
 */
function validateQuestionAgainstSlot(
  raw: unknown,
  slot: QuestionBlueprintSlot,
  path: string,
  issues: QuizValidationIssue[]
): QuizQuestion | undefined {
  if (!isRecord(raw)) {
    issues.push({ path, message: "Her soru bir JSON nesnesi olmalıdır." });
    return undefined;
  }

  const type = raw.type;
  if (typeof type !== "string" || !QUESTION_TYPE_KEYS.has(type as QuestionType)) {
    issues.push({ path: `${path}.type`, message: `Geçersiz veya beklenmeyen soru türü: ${String(type)}` });
    return undefined;
  }
  if (type !== slot.type) {
    issues.push({
      path: `${path}.type`,
      message: `Bu sıradaki soru türü "${slot.type}" olmalıydı ama "${type}" döndürüldü (plan ile uyuşmuyor).`,
    });
    return undefined;
  }

  const common = readCommonFields(raw, slot, path, issues);
  const typed = TYPE_VALIDATORS[slot.type](raw, path, issues);
  if (!common || !typed) return undefined;

  const audit = {
    learningOutcome: slot.learningOutcome,
    cognitiveLevel: slot.cognitiveLevel,
    difficulty: slot.difficulty,
    approach: slot.approach,
    visualType: slot.visualType,
  };

  return {
    id: createQuizGeneratorId("q"),
    prompt: common.prompt,
    visual: common.visual,
    points: common.points,
    answerExplanation: common.answerExplanation,
    audit,
    ...typed,
  } as QuizQuestion;
}

/**
 * Runtime validator for a Quiz Generator AI response. Unlike the Lesson
 * Planner's validator, this one takes the `QuizBlueprint` alongside the
 * raw response — every question is checked for structural correctness AND
 * cross-checked against its corresponding blueprint slot (order, type,
 * visual allocation). A response that drifts from the blueprint is
 * rejected exactly like a structurally malformed one, which is what makes
 * the blueprint an enforced contract rather than a hint.
 */
export function validateQuizResponse(value: unknown, blueprint: QuizBlueprint): QuizValidationResult {
  const issues: QuizValidationIssue[] = [];

  if (!isRecord(value)) {
    return { success: false, issues: [{ path: "root", message: "Yanıt bir JSON nesnesi olmalıdır." }] };
  }

  const title = readNonEmptyString(value, "title", "root", issues);

  const rawQuestions = value.questions;
  if (!Array.isArray(rawQuestions)) {
    issues.push({ path: "questions", message: '"questions" bir dizi (array) olmalıdır.' });
    return { success: false, issues };
  }
  if (rawQuestions.length !== blueprint.slots.length) {
    issues.push({
      path: "questions",
      message:
        `"questions" dizisi ${blueprint.slots.length} öğe içermelidir (plandaki soru sayısı), ` +
        `ama ${rawQuestions.length} öğe döndürüldü.`,
    });
    return { success: false, issues };
  }

  const questions: QuizQuestion[] = [];
  blueprint.slots.forEach((slot, index) => {
    const question = validateQuestionAgainstSlot(rawQuestions[index], slot, `questions[${index}]`, issues);
    if (question) questions.push(question);
  });

  if (!title || questions.length !== blueprint.slots.length) {
    return { success: false, issues };
  }

  return {
    success: true,
    issues: [],
    data: {
      id: createQuizGeneratorId("quiz"),
      title,
      quizType: blueprint.quizType,
      subject: blueprint.subject,
      gradeLevel: blueprint.gradeLevel,
      topic: blueprint.topic,
      questions,
      includeAnswerKey: blueprint.includeAnswerKey,
      generatedAt: new Date().toISOString(),
    },
  };
}
