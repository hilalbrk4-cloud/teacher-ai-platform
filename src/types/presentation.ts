import type { LessonPlanCurriculumContext, LessonPlanCurriculumSelection } from "@/types/curriculum";

/** yeniKonu: keşif ve görsel ağırlıklı · pekistirme: ders sonu · tartisma: sınıf içi tartışma ve etkinlik. */
export const PRESENTATION_TYPES = ["yeniKonu", "pekistirme", "tartisma"] as const;
export type PresentationType = (typeof PRESENTATION_TYPES)[number];

/** 5: mikro sunum (~15 dk) · 8: standart ders. */
export type SlideCount = 5 | 8;

export const SLIDE_LAYOUTS = ["split-right-image", "split-left-image", "hero-visual", "activity-timer"] as const;
export type SlideLayout = (typeof SLIDE_LAYOUTS)[number];

export const SLIDE_VISUAL_TYPES = ["photo", "diagram_placeholder", "icon_badge"] as const;
export type SlideVisualType = (typeof SLIDE_VISUAL_TYPES)[number];

/** `icon_badge` görselleri için sabit ikon listesi (lucide eşlemesi `slide-icons.tsx`). */
export const SLIDE_ICONS = [
  "microscope",
  "leaf",
  "flask",
  "atom",
  "sun",
  "globe",
  "lightbulb",
  "users",
  "book",
  "calculator",
  "ruler",
  "map",
  "landmark",
  "music",
  "heart",
  "question",
  "target",
  "puzzle",
  "zap",
  "droplet",
] as const;
export type SlideIcon = (typeof SLIDE_ICONS)[number];

export interface SlideVisual {
  type: SlideVisualType;
  /** Görsel arama için nokta atışı İngilizce terim ("plant cell biology microscope"). */
  searchKeyword: string;
  /** Görselin altındaki merak uyandırıcı tek cümlelik soru/ipucu. */
  caption: string;
  icon: SlideIcon;
}

export interface Slide {
  slideNumber: number;
  /** En fazla 5 kelime. */
  title: string;
  layout: SlideLayout;
  visual: SlideVisual;
  /** 0-3 kısa madde; paragraf yok. */
  bullets: string[];
  /** Öğretmenin sınıfa soracağı yönlendirici soru (tahtada görünmez). */
  teacherNote: string;
  /** 2 dakikalık sınıf içi görev / tartışma sorusu; yalnızca etkinlik slaytlarında. */
  activityPrompt: string | null;
  /** Slaytın hizmet ettiği resmî öğrenme çıktısı kodları (havuzdan). */
  outcomeCodes: string[];
}

export interface Presentation {
  id: string;
  subject: string;
  gradeLevel: string;
  topic: string;
  type: PresentationType;
  slideCount: SlideCount;
  title: string;
  slides: Slide[];
  curriculum?: LessonPlanCurriculumContext;
  generatedAt: string;
}

export interface PresentationFormInput {
  subject: string;
  gradeLevel: string;
  topic: string;
  type: PresentationType;
  slideCount: SlideCount;
  curriculum: LessonPlanCurriculumSelection | null;
}

export type PresentationRequiredField = "subject" | "gradeLevel" | "topic";
export type PresentationFormErrors = Partial<Record<PresentationRequiredField, string>>;
export type PresentationGenerationStatus = "idle" | "loading" | "success" | "error";

export interface PresentationPrompt {
  input: PresentationFormInput;
  curriculum?: LessonPlanCurriculumContext;
  allowedOutcomeCodes: string[];
  instructions: string;
}

/** Görsel arama sonucu (sunucudan); lisans ve atıf bilgisiyle. */
export interface SlideImage {
  url: string;
  width: number;
  height: number;
  source: "unsplash" | "wikimedia";
  credit: { author: string; license: string; pageUrl: string };
}
