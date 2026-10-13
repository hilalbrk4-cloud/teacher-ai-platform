"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ImageOff, ImagePlus, Landmark, Loader2, MessageCircleQuestion, Presentation as PresentationIcon, RefreshCw, Sparkles, Timer } from "lucide-react";

import { LessonPlanLoadingState } from "@/components/features/lesson-planner/lesson-plan-loading-state";
import { SlideCanvas } from "@/components/features/presentation-builder/slide-canvas";
import { SectionTitle } from "@/components/shared/section-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SlideImageState } from "@/hooks/use-slide-images";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/types/i18n";
import type { Presentation, PresentationGenerationStatus } from "@/types/presentation";

interface PresentationPreviewProps {
  t: Dictionary;
  status: PresentationGenerationStatus;
  loadingStage: number;
  presentation: Presentation | null;
  index: number;
  onIndexChange: (index: number) => void;
  imageFor: (slideNumber: number) => SlideImageState;
  onNextImage: (slideNumber: number) => void;
  onToggleImage: (slideNumber: number) => void;
  onOpenBoard: () => void;
  onExport: () => void;
  exporting: boolean;
  onRegenerate: () => void;
}

export function PresentationPreview({
  t,
  status,
  loadingStage,
  presentation,
  index,
  onIndexChange,
  imageFor,
  onNextImage,
  onToggleImage,
  onOpenBoard,
  onExport,
  exporting,
  onRegenerate,
}: PresentationPreviewProps) {
  const copy = t.presentationBuilder;
  const loading = status === "loading";

  if (!presentation) {
    return (
      <Card className="flex flex-col gap-4 overflow-clip p-0">
        <div className="border-b border-border bg-muted/40 px-4 py-3.5 lg:px-5">
          <SectionTitle title={copy.preview.title} />
        </div>
        <div className="flex flex-col gap-4 px-4 pb-5 lg:px-5">
          {loading ? (
            <LessonPlanLoadingState message={copy.loadingMessages[loadingStage]} stage={loadingStage} totalStages={copy.loadingMessages.length} />
          ) : (
            <div className="flex items-start gap-2.5 rounded-lg border border-dashed border-border px-3.5 py-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="size-3.5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{copy.preview.emptyTitle}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{copy.preview.emptyDescription}</p>
              </div>
            </div>
          )}
          <div aria-hidden="true" className={cn("flex flex-col gap-3", loading && "animate-pulse")}>
            <div className="flex aspect-video items-end rounded-xl bg-gradient-to-br from-indigo-100 via-sky-50 to-emerald-50 p-5 ring-1 ring-foreground/5">
              <div className="flex w-1/2 flex-col gap-2">
                <div className="h-3 w-1/3 rounded-full bg-indigo-200" />
                <div className="h-5 w-full rounded-full bg-indigo-300/70" />
                <div className="h-3 w-2/3 rounded-full bg-indigo-200" />
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((item) => (
                <div key={item} className="aspect-video rounded-md bg-muted ring-1 ring-foreground/5" />
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const slide = presentation.slides[index];
  const image = imageFor(slide.slideNumber);
  const meta = { subject: presentation.subject, gradeLevel: presentation.gradeLevel };
  const total = presentation.slides.length;
  const outcomeText = new Map(presentation.curriculum?.outcomes.map((outcome) => [outcome.code, outcome.text]) ?? []);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") onIndexChange(Math.min(total - 1, index + 1));
    else if (event.key === "ArrowLeft") onIndexChange(Math.max(0, index - 1));
    else return;
    event.preventDefault();
  }

  return (
    <Card id="presentation-preview" className="flex flex-col gap-0 overflow-clip p-0 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <div className="flex flex-col gap-3 border-b border-border bg-muted/40 px-4 py-3.5 lg:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionTitle title={presentation.title} description={`${presentation.subject} · ${presentation.gradeLevel} · ${presentation.topic}`} />
          <div className="flex flex-wrap gap-2">
            {/* Etiket "🖥️" emojisini içerdiği için ayrıca ikon eklenmez. */}
            <Button type="button" onClick={onOpenBoard} disabled={loading} className="gap-1.5">
              {copy.board.open}
            </Button>
            <Button type="button" variant="outline" onClick={onExport} disabled={loading || exporting} aria-busy={exporting} className="gap-1.5">
              {exporting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <PresentationIcon className="size-4" aria-hidden="true" />}
              {exporting ? copy.actions.exportingPptx : copy.actions.exportPptx}
            </Button>
            <Button type="button" variant="ghost" onClick={onRegenerate} disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
              {loading ? copy.actions.regenerating : copy.actions.regenerate}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{copy.form.types[presentation.type].label}</Badge>
          <Badge variant="secondary">{copy.form.slideCounts[String(presentation.slideCount) as "5" | "8"].label}</Badge>
          {presentation.curriculum ? (
            <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
              <Landmark aria-hidden="true" />
              TYMM · {presentation.curriculum.outcomes.map((outcome) => outcome.code).join(", ")}
            </Badge>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="px-4 pt-4 lg:px-5">
          <LessonPlanLoadingState message={copy.loadingMessages[loadingStage]} stage={loadingStage} totalStages={copy.loadingMessages.length} />
        </div>
      ) : null}

      <div className={cn("@container px-4 py-4 lg:px-5", loading && "pointer-events-none opacity-50")}>
        <div className="flex flex-col gap-4 @3xl:grid @3xl:grid-cols-[150px_1fr] @3xl:items-start">
          {/* Filmstrip: geniş alanda solda dikey, dar alanda slaytın altında yatay */}
          <nav aria-label={copy.preview.filmstripLabel} className="order-2 @3xl:order-1">
            <ol className="flex gap-2 overflow-x-auto pb-1 @3xl:max-h-[38rem] @3xl:flex-col @3xl:overflow-x-visible @3xl:overflow-y-auto @3xl:pr-1">
              {presentation.slides.map((item, itemIndex) => {
                const current = itemIndex === index;
                return (
                  <li key={item.slideNumber} className="w-32 shrink-0 @3xl:w-full">
                    <button
                      type="button"
                      onClick={() => onIndexChange(itemIndex)}
                      aria-current={current ? "true" : undefined}
                      aria-label={`${item.slideNumber}. ${item.title}`}
                      className={cn(
                        "group flex w-full flex-col gap-1 rounded-lg p-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        current ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted"
                      )}
                    >
                      <SlideCanvas t={t} slide={item} image={imageFor(item.slideNumber)} meta={meta} total={total} mode="thumb" />
                      <span className="flex items-center gap-1 px-0.5 text-[0.68rem] font-medium text-muted-foreground">
                        <span className="tabular-nums">{item.slideNumber}</span>
                        {item.layout === "activity-timer" ? <Timer className="size-3 text-amber-500" aria-hidden="true" /> : null}
                        <span className="truncate">{item.title}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="order-1 flex min-w-0 flex-col gap-3 @3xl:order-2">
            <div
              tabIndex={0}
              onKeyDown={handleKeyDown}
              aria-roledescription="slayt"
              aria-label={copy.preview.slideLabel(index + 1, total)}
              className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <SlideCanvas key={`${presentation.id}-${slide.slideNumber}`} t={t} slide={slide} image={image} meta={meta} total={total} mode="preview" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Button type="button" variant="outline" size="icon-sm" onClick={() => onIndexChange(Math.max(0, index - 1))} disabled={index === 0} aria-label={copy.preview.previous}>
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <span className="min-w-20 text-center text-sm font-medium tabular-nums text-foreground" aria-live="polite">
                  {copy.preview.slideLabel(index + 1, total)}
                </span>
                <Button type="button" variant="outline" size="icon-sm" onClick={() => onIndexChange(Math.min(total - 1, index + 1))} disabled={index === total - 1} aria-label={copy.preview.next}>
                  <ChevronRight aria-hidden="true" />
                </Button>
                <Badge variant="outline" className="ml-1 font-normal text-muted-foreground">
                  {copy.preview.layouts[slide.layout]}
                </Badge>
              </div>
              {slide.visual.type !== "icon_badge" ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onNextImage(slide.slideNumber)}
                    disabled={image.status !== "ready" || image.total < 2}
                    className="gap-1.5"
                  >
                    <ImagePlus className="size-3.5" aria-hidden="true" />
                    {copy.preview.nextImage}
                    {image.status === "ready" ? <span className="tabular-nums text-muted-foreground">{copy.preview.imageCount(image.index + 1, image.total)}</span> : null}
                  </Button>
                  {(image.status === "ready" || image.removed) ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => onToggleImage(slide.slideNumber)} className="gap-1.5 text-muted-foreground">
                      <ImageOff className="size-3.5" aria-hidden="true" />
                      {image.removed ? copy.preview.restoreImage : copy.preview.removeImage}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <section className="flex flex-col gap-2.5 rounded-xl border border-amber-500/20 bg-amber-50/60 p-3.5 dark:bg-amber-500/5">
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-amber-800 uppercase dark:text-amber-300">
                <MessageCircleQuestion className="size-3.5" aria-hidden="true" />
                {copy.preview.teacherNote}
              </p>
              <p className="text-[0.95rem] leading-relaxed font-medium text-foreground">{slide.teacherNote}</p>
              {slide.activityPrompt ? (
                <p className="text-sm text-foreground/85">
                  <span className="font-semibold">{copy.preview.activity}:</span> {slide.activityPrompt}
                </p>
              ) : null}
              {slide.outcomeCodes.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {slide.outcomeCodes.map((code) => (
                    <Badge key={code} variant="outline" className="border-primary/25 bg-card font-normal" title={outcomeText.get(code)}>
                      <span className="font-semibold text-primary">{code}</span>
                      <span className="max-w-64 truncate text-muted-foreground">{outcomeText.get(code)}</span>
                    </Badge>
                  ))}
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </Card>
  );
}
