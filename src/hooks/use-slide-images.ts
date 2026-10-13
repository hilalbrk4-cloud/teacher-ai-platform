"use client";

import * as React from "react";

import type { Presentation, SlideImage } from "@/types/presentation";

/** Aynı arama terimi oturumda bir kez sorgulanır. */
const candidateCache = new Map<string, Promise<SlideImage[]>>();

function loadCandidates(keyword: string, type: string): Promise<SlideImage[]> {
  const key = `${type}:${keyword}`;
  let request = candidateCache.get(key);
  if (!request) {
    request = fetch(`/api/presentations/image?q=${encodeURIComponent(keyword)}&type=${encodeURIComponent(type)}`)
      .then((response) => (response.ok ? response.json() : { images: [] }))
      .then((body: { images?: SlideImage[] }) => body.images ?? [])
      .catch(() => [] as SlideImage[]);
    candidateCache.set(key, request);
  }
  return request;
}

export interface SlideImageState {
  status: "loading" | "ready" | "none";
  /** Seçili görsel; öğretmen kaldırdıysa ya da bulunamadıysa undefined. */
  image?: SlideImage;
  index: number;
  total: number;
  removed: boolean;
}

/**
 * Sunumdaki tüm slaytların görsel adaylarını paralel yükler ve slayt başına
 * seçimi tutar. Önizleme, minyatürler, tahta modu ve PPTX aynı seçimi kullanır.
 */
export function useSlideImages(presentation: Presentation | null) {
  const [candidates, setCandidates] = React.useState<{ id: string; bySlide: Record<number, SlideImage[]> } | null>(null);
  const [choices, setChoices] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    if (!presentation) return;
    let active = true;
    const id = presentation.id;
    presentation.slides.forEach((slide) => {
      if (slide.visual.type === "icon_badge") return;
      loadCandidates(slide.visual.searchKeyword, slide.visual.type).then((images) => {
        if (!active) return;
        setCandidates((prev) => ({
          id,
          bySlide: { ...(prev?.id === id ? prev.bySlide : {}), [slide.slideNumber]: images },
        }));
      });
    });
    return () => {
      active = false;
    };
  }, [presentation]);

  const stateFor = React.useCallback(
    (slideNumber: number): SlideImageState => {
      const slide = presentation?.slides.find((item) => item.slideNumber === slideNumber);
      if (!presentation || !slide || slide.visual.type === "icon_badge") return { status: "none", index: 0, total: 0, removed: false };
      const list = candidates?.id === presentation.id ? candidates.bySlide[slideNumber] : undefined;
      if (!list) return { status: "loading", index: 0, total: 0, removed: false };
      const choice = choices[`${presentation.id}:${slideNumber}`] ?? 0;
      if (choice < 0) return { status: "none", index: 0, total: list.length, removed: true };
      if (list.length === 0) return { status: "none", index: 0, total: 0, removed: false };
      return { status: "ready", image: list[choice % list.length], index: choice % list.length, total: list.length, removed: false };
    },
    [presentation, candidates, choices]
  );

  const nextImage = React.useCallback(
    (slideNumber: number) => {
      if (!presentation) return;
      const key = `${presentation.id}:${slideNumber}`;
      setChoices((prev) => ({ ...prev, [key]: Math.max(0, prev[key] ?? 0) + 1 }));
    },
    [presentation]
  );

  /** Görseli kaldır / geri getir (kaldırınca ikon rozeti gösterilir). */
  const toggleRemoved = React.useCallback(
    (slideNumber: number) => {
      if (!presentation) return;
      const key = `${presentation.id}:${slideNumber}`;
      setChoices((prev) => ({ ...prev, [key]: (prev[key] ?? 0) < 0 ? 0 : -1 }));
    },
    [presentation]
  );

  return { stateFor, nextImage, toggleRemoved };
}
