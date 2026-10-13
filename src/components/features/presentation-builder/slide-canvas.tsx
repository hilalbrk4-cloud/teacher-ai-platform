"use client";

import * as React from "react";
import { CircleHelp, Timer } from "lucide-react";

import { SLIDE_ICON_COMPONENTS } from "@/components/features/presentation-builder/slide-icons";
import { SlideTimer, type SlideTimerHandle } from "@/components/features/presentation-builder/slide-timer";
import type { SlideImageState } from "@/hooks/use-slide-images";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/types/i18n";
import type { Slide } from "@/types/presentation";

export type SlideCanvasMode = "thumb" | "preview" | "board";

interface SlideCanvasProps {
  t: Dictionary;
  slide: Slide;
  image: SlideImageState;
  meta: { subject: string; gradeLevel: string };
  total: number;
  mode: SlideCanvasMode;
  timerRef?: React.Ref<SlideTimerHandle>;
  className?: string;
}

/**
 * Tek bir 16:9 slayt. Tüm ölçüler kapsayıcı genişliğine göre (cqw) verilir;
 * aynı bileşen minyatürde, önizlemede ve akıllı tahtada birebir aynı oranla
 * görünür. Slaytlar uygulama temasından bağımsız, yansıtmaya uygun açık
 * renk paletiyle çizilir.
 */
export function SlideCanvas({ t, slide, image, meta, total, mode, timerRef, className }: SlideCanvasProps) {
  const thumb = mode === "thumb";
  const Icon = SLIDE_ICON_COMPONENTS[slide.visual.icon];

  return (
    <div className={cn("@container w-full", className)}>
      <div
        className="relative aspect-video w-full overflow-hidden bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/10 select-none"
        style={{ borderRadius: thumb ? "0.35rem" : "0.75rem" }}
        role={thumb ? undefined : "img"}
        aria-label={thumb ? undefined : `${slide.slideNumber}. ${slide.title}`}
      >
        {slide.layout === "hero-visual" ? (
          <HeroLayout slide={slide} image={image} meta={meta} thumb={thumb} Icon={Icon} t={t} />
        ) : slide.layout === "activity-timer" ? (
          <ActivityLayout slide={slide} image={image} thumb={thumb} Icon={Icon} t={t} timerRef={timerRef} interactive={!thumb} />
        ) : (
          <SplitLayout slide={slide} image={image} thumb={thumb} Icon={Icon} t={t} imageLeft={slide.layout === "split-left-image"} />
        )}
        {!thumb && slide.layout !== "hero-visual" ? (
          <span className="absolute right-[1.6cqw] bottom-[1.2cqw] text-[1.1cqw] font-medium tabular-nums text-slate-400">
            {slide.slideNumber} / {total}
          </span>
        ) : null}
      </div>
    </div>
  );
}

interface LayoutProps {
  t: Dictionary;
  slide: Slide;
  image: SlideImageState;
  thumb: boolean;
  Icon: React.ComponentType<{ className?: string }>;
}

/** Görsel alanı: fotoğraf (kırpılarak doldurur), şema (etiketler okunsun diye sığdırılır), yoksa ikonlu yer tutucu. */
function VisualArea({ t, slide, image, thumb, Icon, fit }: LayoutProps & { fit?: "cover" | "contain" }) {
  const preview = t.presentationBuilder.preview;
  const contain = fit === "contain" || (fit === undefined && slide.visual.type === "diagram_placeholder");
  if (image.status === "ready" && image.image) {
    return (
      <div className={cn("absolute inset-0", contain ? "bg-white" : "bg-slate-200")}>
        {/* Görseller dış kaynaklardan (Wikimedia/Unsplash) dinamik geldiği için next/image yerine düz img kullanılır. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.image.url}
          alt={slide.visual.caption}
          referrerPolicy="no-referrer"
          loading={thumb ? "lazy" : "eager"}
          className={cn("size-full", contain ? "object-contain p-[1.5cqw]" : "object-cover")}
        />
        {!thumb ? (
          <span className="absolute right-[0.8cqw] bottom-[0.6cqw] max-w-[60%] truncate rounded bg-black/45 px-[0.6cqw] py-[0.2cqw] text-[0.85cqw] text-white/90">
            {preview.imageCredit(image.image.credit.author, image.image.credit.license)}
          </span>
        ) : null}
      </div>
    );
  }
  // İkon rozeti ya da görsel bulunamadığında/yüklenirken: sakin degrade + büyük ikon.
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[1.2cqw] bg-gradient-to-br from-indigo-50 via-sky-50 to-emerald-50">
      <span className="flex size-[13cqw] items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/25">
        <Icon className="size-[6.5cqw]" />
      </span>
      {!thumb && slide.visual.type !== "icon_badge" ? (
        <span className="rounded-full bg-white/80 px-[1.2cqw] py-[0.4cqw] text-[1.1cqw] text-slate-500">
          {image.status === "loading" ? preview.imageLoading : `${preview.imageNone} · “${slide.visual.searchKeyword}”`}
        </span>
      ) : null}
    </div>
  );
}

function Caption({ slide, thumb, dark }: { slide: Slide; thumb: boolean; dark?: boolean }) {
  if (thumb) return null;
  return (
    <p
      className={cn(
        "flex items-start gap-[0.6cqw] rounded-[0.8cqw] px-[1.2cqw] py-[0.8cqw] text-[1.55cqw] leading-snug font-medium backdrop-blur-md",
        dark ? "bg-white/15 text-white ring-1 ring-white/25" : "bg-white/85 text-slate-800 shadow-sm ring-1 ring-slate-900/5"
      )}
    >
      <CircleHelp className="mt-[0.15cqw] size-[1.8cqw] shrink-0 text-amber-500" aria-hidden="true" />
      {slide.visual.caption}
    </p>
  );
}

function Bullets({ bullets, dark }: { bullets: string[]; dark?: boolean }) {
  if (bullets.length === 0) return null;
  return (
    <ul className="flex flex-col gap-[1.2cqw]">
      {bullets.map((bullet) => (
        <li key={bullet} className={cn("flex items-start gap-[1cqw] text-[2.3cqw] leading-tight font-medium", dark ? "text-white/90" : "text-slate-700")}>
          <span className="mt-[0.75cqw] size-[1cqw] shrink-0 rounded-full bg-indigo-500" aria-hidden="true" />
          {bullet}
        </li>
      ))}
    </ul>
  );
}

function HeroLayout({ t, slide, image, meta, thumb, Icon }: LayoutProps & { meta: { subject: string; gradeLevel: string } }) {
  const hasImage = image.status === "ready";
  return (
    <>
      <VisualArea t={t} slide={slide} image={image} thumb={thumb} Icon={Icon} fit="cover" />
      <div
        className={cn(
          "absolute inset-0",
          hasImage ? "bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/10" : "bg-gradient-to-t from-slate-950/80 via-slate-900/40 to-transparent"
        )}
      />
      <div className="absolute inset-x-[5cqw] bottom-[5cqw] flex flex-col gap-[1.6cqw]">
        <span className="w-fit rounded-full bg-white/15 px-[1.2cqw] py-[0.35cqw] text-[1.25cqw] font-semibold tracking-wide text-white/90 uppercase ring-1 ring-white/25">
          {meta.subject} · {meta.gradeLevel}
        </span>
        <h2 className="max-w-[80%] text-[6.2cqw] leading-[1.05] font-extrabold tracking-tight text-white text-balance">{slide.title}</h2>
        <div className="max-w-[70%]">
          <Caption slide={slide} thumb={thumb} dark />
        </div>
        {!thumb ? <Bullets bullets={slide.bullets} dark /> : null}
      </div>
    </>
  );
}

function SplitLayout({ t, slide, image, thumb, Icon, imageLeft }: LayoutProps & { imageLeft: boolean }) {
  return (
    <div className={cn("absolute inset-0 grid grid-cols-[54%_46%]", imageLeft && "grid-cols-[46%_54%]")}>
      <div className={cn("relative flex flex-col justify-center gap-[2.4cqw] px-[5cqw] py-[4cqw]", imageLeft && "order-2")}>
        <span className="absolute top-[3.2cqw] left-[5cqw] h-[0.6cqw] w-[6cqw] rounded-full bg-indigo-500" aria-hidden="true" />
        <h2 className="text-[4.4cqw] leading-[1.08] font-extrabold tracking-tight text-slate-900 text-balance">{slide.title}</h2>
        <Bullets bullets={thumb ? slide.bullets.slice(0, 3) : slide.bullets} />
      </div>
      <div className={cn("relative", imageLeft && "order-1")}>
        <VisualArea t={t} slide={slide} image={image} thumb={thumb} Icon={Icon} />
        <div className="absolute inset-x-[1.6cqw] bottom-[2.6cqw]">
          <Caption slide={slide} thumb={thumb} />
        </div>
      </div>
    </div>
  );
}

function ActivityLayout({
  t,
  slide,
  image,
  thumb,
  Icon,
  timerRef,
  interactive,
}: LayoutProps & { timerRef?: React.Ref<SlideTimerHandle>; interactive: boolean }) {
  const board = t.presentationBuilder.board;
  return (
    <div className="absolute inset-0 grid grid-cols-[62%_38%] bg-gradient-to-br from-amber-50 via-white to-indigo-50">
      <div className="flex flex-col justify-center gap-[2cqw] px-[5cqw] py-[4cqw]">
        <span className="flex w-fit items-center gap-[0.6cqw] rounded-full bg-amber-400 px-[1.4cqw] py-[0.45cqw] text-[1.4cqw] font-bold text-slate-900">
          <Timer className="size-[1.7cqw]" aria-hidden="true" />
          {board.activityBadge}
        </span>
        <h2 className="text-[4.2cqw] leading-[1.08] font-extrabold tracking-tight text-slate-900 text-balance">{slide.title}</h2>
        <p className="rounded-[1.2cqw] bg-white px-[2cqw] py-[1.6cqw] text-[2.5cqw] leading-snug font-semibold text-slate-800 shadow-sm ring-1 ring-slate-900/5">
          {slide.activityPrompt}
        </p>
        {!thumb ? <Bullets bullets={slide.bullets} /> : null}
      </div>
      <div className="flex flex-col items-center justify-center gap-[2cqw] px-[2cqw]">
        {image.status === "ready" && image.image && !thumb ? (
          <div className="relative h-[15cqw] w-[24cqw] overflow-hidden rounded-[1cqw] ring-1 ring-slate-900/10">
            <VisualArea t={t} slide={slide} image={image} thumb Icon={Icon} />
          </div>
        ) : (
          <span className="flex size-[9cqw] items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-white">
            <Icon className="size-[4.5cqw]" />
          </span>
        )}
        <SlideTimer ref={timerRef} t={t} interactive={interactive} />
      </div>
    </div>
  );
}
