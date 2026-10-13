import { MAX_OUTCOMES_IN_FOCUS, requiredActivitySlides } from "@/lib/presentation/prompt";
import {
  SLIDE_ICONS,
  SLIDE_LAYOUTS,
  SLIDE_VISUAL_TYPES,
  type PresentationPrompt,
  type Slide,
  type SlideIcon,
  type SlideLayout,
  type SlideVisualType,
} from "@/types/presentation";

export type PresentationRule =
  | "json"
  | "bos_alan"
  | "slayt_sayisi"
  | "baslik"
  | "madde"
  | "gorsel"
  | "ogretmen_notu"
  | "etkinlik"
  | "duzen"
  | "kapsam";

export const PRESENTATION_RULE_LABELS: Record<PresentationRule, string> = {
  json: "JSON hatası",
  bos_alan: "Boş alan",
  slayt_sayisi: "Slayt sayısı",
  baslik: "Başlık uzunluğu",
  madde: "Madde uzunluğu",
  gorsel: "Görsel parametreleri",
  ogretmen_notu: "Öğretmen notu",
  etkinlik: "Etkinlik slaytları",
  duzen: "Slayt düzeni",
  kapsam: "Öğrenme çıktısı kapsamı",
};

export interface PresentationIssue {
  rule: PresentationRule;
  path: string;
  message: string;
}

export interface PresentationBody {
  title: string;
  slides: Slide[];
}

const STRING = { type: "string" } as const;

/** OpenAI `json_schema` (strict): düzen, görsel türü ve ikon enum; resmî kodlar havuzla sınırlı. */
export function buildPresentationJsonSchema(prompt: PresentationPrompt) {
  const slideProperties: Record<string, unknown> = {
    title: STRING,
    layout: { type: "string", enum: [...SLIDE_LAYOUTS] },
    visual: {
      type: "object",
      additionalProperties: false,
      required: ["type", "searchKeyword", "caption", "icon"],
      properties: {
        type: { type: "string", enum: [...SLIDE_VISUAL_TYPES] },
        searchKeyword: STRING,
        caption: STRING,
        icon: { type: "string", enum: [...SLIDE_ICONS] },
      },
    },
    bullets: { type: "array", items: STRING },
    teacherNote: STRING,
    activityPrompt: { type: ["string", "null"] },
  };
  if (prompt.allowedOutcomeCodes.length > 0) {
    slideProperties.outcomeCodes = { type: "array", items: { type: "string", enum: prompt.allowedOutcomeCodes } };
  }
  return {
    type: "object",
    additionalProperties: false,
    required: ["title", "slides"],
    properties: {
      title: STRING,
      slides: {
        type: "array",
        items: { type: "object", additionalProperties: false, required: Object.keys(slideProperties), properties: slideProperties },
      },
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const text = (value: unknown) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");
const words = (value: string) => (value ? value.split(" ").length : 0);
/** Cümle sonu sayısı (sondaki noktalama hariç): tek cümle denetimi için. */
const innerSentenceBreaks = (value: string) => (value.replace(/[.!?…]+$/, "").match(/[.!?](\s|$)/g) ?? []).length;

/**
 * Model yanıtını sunuma çevirir ve görsel odaklı slayt kurallarını denetler.
 * Slayt numaraları kodla verilir; her sorun bozulan kuralı taşır.
 */
export function validatePresentationBody(value: unknown, prompt: PresentationPrompt): { body?: PresentationBody; issues: PresentationIssue[] } {
  const issues: PresentationIssue[] = [];
  const issue = (rule: PresentationRule, path: string, message: string) => issues.push({ rule, path, message });
  if (!isRecord(value)) return { issues: [{ rule: "json", path: "root", message: "Yanıt bir JSON nesnesi değil." }] };

  const { slideCount, type } = prompt.input;
  const title = text(value.title);
  if (!title) issue("bos_alan", "title", "Sunum başlığı boş.");
  const rawSlides = Array.isArray(value.slides) ? value.slides : [];
  if (rawSlides.length !== slideCount) issue("slayt_sayisi", "slides", `Tam ${slideCount} slayt gerekli; ${rawSlides.length} geldi.`);

  const allowed = new Set(prompt.allowedOutcomeCodes);
  const slides: Slide[] = rawSlides.map((raw, index) => {
    const path = `slides[${index}]`;
    const n = index + 1;
    const item = isRecord(raw) ? raw : {};
    const visualRaw = isRecord(item.visual) ? item.visual : {};
    const slideTitle = text(item.title);
    const layout = (SLIDE_LAYOUTS as readonly string[]).includes(String(item.layout)) ? (item.layout as SlideLayout) : "split-right-image";
    const visualType = (SLIDE_VISUAL_TYPES as readonly string[]).includes(String(visualRaw.type)) ? (visualRaw.type as SlideVisualType) : "photo";
    const icon = (SLIDE_ICONS as readonly string[]).includes(String(visualRaw.icon)) ? (visualRaw.icon as SlideIcon) : "lightbulb";
    const searchKeyword = text(visualRaw.searchKeyword).toLowerCase();
    const caption = text(visualRaw.caption);
    const bullets = (Array.isArray(item.bullets) ? item.bullets : []).map(text).filter(Boolean);
    const teacherNote = text(item.teacherNote);
    const activityPrompt = text(item.activityPrompt) || null;
    const outcomeCodes = [...new Set((Array.isArray(item.outcomeCodes) ? item.outcomeCodes : []).filter((code): code is string => typeof code === "string" && allowed.has(code)))];

    if (!slideTitle) issue("bos_alan", `${path}.title`, `${n}. slayt başlığı boş.`);
    else if (words(slideTitle) > 5) issue("baslik", `${path}.title`, `${n}. slayt başlığı ${words(slideTitle)} kelime ("${slideTitle}"); en fazla 5 olmalı.`);
    if (bullets.length > 3) issue("madde", `${path}.bullets`, `${n}. slaytta ${bullets.length} madde var; en fazla 3.`);
    // Paragraf yasağı kelime sınırıyla uygulanır; "Kim bu hücre? Bitki mi, hayvan mı?" gibi kısa soru kalıpları serbest.
    const longBullet = bullets.find((bullet) => words(bullet) > 12 || innerSentenceBreaks(bullet) > 2);
    if (longBullet) issue("madde", `${path}.bullets`, `${n}. slaytta uzun/paragraf madde var ("${longBullet}"); her madde en fazla 10-12 kelime.`);
    // İkon rozetinde görsel aranmaz: arama terimi isteğe bağlıdır (geçersizse yok sayılır).
    const keywordValid = /^[a-z0-9 -]+$/.test(searchKeyword) && words(searchKeyword) >= 2 && words(searchKeyword) <= 6;
    if (visualType !== "icon_badge" && !keywordValid) {
      issue("gorsel", `${path}.visual.searchKeyword`, `${n}. slaytın arama terimi 2-6 kelimelik İngilizce olmalı ("${searchKeyword}").`);
    }
    // Etkinlik düzeninde görsel açıklaması gösterilmez; diğer düzenlerde zorunlu.
    if (!caption && layout !== "activity-timer") issue("bos_alan", `${path}.visual.caption`, `${n}. slaytın görsel açıklaması boş.`);
    else if (words(caption) > 22) issue("gorsel", `${path}.visual.caption`, `${n}. slaytın görsel açıklaması çok uzun (${words(caption)} kelime); tek kısa soru/ipucu olmalı.`);
    if (!teacherNote.endsWith("?")) issue("ogretmen_notu", `${path}.teacherNote`, `${n}. slaytın öğretmen notu sınıfa sorulacak bir soru olmalı.`);
    if (layout === "activity-timer" && !activityPrompt) issue("etkinlik", `${path}.activityPrompt`, `${n}. slayt etkinlik düzeninde ama etkinlik görevi boş.`);
    if (layout !== "activity-timer" && activityPrompt) issue("etkinlik", `${path}.activityPrompt`, `${n}. slaytta etkinlik görevi var ama düzeni "activity-timer" değil.`);
    if (activityPrompt && words(activityPrompt) > 40) issue("etkinlik", `${path}.activityPrompt`, `${n}. slaytın etkinlik görevi 40 kelimeden uzun.`);

    return {
      slideNumber: n,
      title: slideTitle,
      layout,
      visual: { type: visualType, searchKeyword: keywordValid ? searchKeyword : "", caption, icon },
      bullets: bullets.slice(0, 3),
      teacherNote,
      activityPrompt: layout === "activity-timer" ? activityPrompt : null,
      outcomeCodes,
    };
  });

  if (slides.length > 0 && slides[0].layout !== "hero-visual") issue("duzen", "slides[0].layout", "1. slayt kapak (\"hero-visual\") olmalı.");
  const activityCount = slides.filter((slide) => slide.layout === "activity-timer").length;
  const requiredActivities = requiredActivitySlides(type, slideCount);
  if (activityCount < requiredActivities) issue("etkinlik", "slides", `En az ${requiredActivities} etkinlik slaytı gerekli; ${activityCount} var.`);
  if (activityCount > slideCount - 2) issue("etkinlik", "slides", `Etkinlik slaytı çok fazla (${activityCount}); içerik slaytlarına yer kalmalı.`);

  if (prompt.curriculum && prompt.allowedOutcomeCodes.length > 0) {
    const used = new Set(slides.flatMap((slide) => slide.outcomeCodes));
    const required = prompt.curriculum.program === "onceki" ? 1 : Math.min(MAX_OUTCOMES_IN_FOCUS, prompt.allowedOutcomeCodes.length);
    if (used.size < required) issue("kapsam", "slides.outcomeCodes", `Seçilen çıktılardan en az ${required} tanesi slaytlara bağlanmalı; ${used.size} bağlandı.`);
  }

  return issues.length > 0 ? { issues } : { body: { title, slides }, issues };
}
