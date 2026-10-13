"use client";

import * as React from "react";
import { CheckCircle2, MonitorPlay, PanelLeftClose, PanelLeftOpen, XCircle } from "lucide-react";

import { PresentationForm } from "@/components/features/presentation-builder/presentation-form";
import { PresentationPreview } from "@/components/features/presentation-builder/presentation-preview";
import { SmartBoard } from "@/components/features/presentation-builder/smart-board";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePresentationGenerator } from "@/hooks/use-presentation-generator";
import { useSlideImages } from "@/hooks/use-slide-images";
import { useTranslations } from "@/lib/i18n/locale-provider";
import { downloadPresentationPptx } from "@/lib/presentation/export-pptx";
import { cn } from "@/lib/utils";

export function PresentationBuilderWorkspace() {
  const t = useTranslations();
  const copy = t.presentationBuilder;
  const generator = usePresentationGenerator(t);
  const { form, errors, status, loadingStage, presentation, feedback, showFeedback } = generator;
  const images = useSlideImages(presentation);
  const [index, setIndex] = React.useState(0);
  const [formOpen, setFormOpen] = React.useState(true);
  const [boardOpen, setBoardOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  // Slaytlar geldikten sonra form daralır; önizleme tam genişliğe geçer.
  async function handleGenerate() {
    const ok = await generator.generate();
    if (ok) {
      setIndex(0);
      setFormOpen(false);
    }
  }

  async function handleExport() {
    if (!presentation) return;
    setExporting(true);
    try {
      const fileName = await downloadPresentationPptx(presentation, (slideNumber) => images.stateFor(slideNumber).image);
      showFeedback({ type: "success", message: copy.feedback.exported(fileName) });
    } catch (error) {
      console.error("[EduPilot] PPTX export failed:", error);
      showFeedback({ type: "error", message: copy.feedback.exportError });
    } finally {
      setExporting(false);
    }
  }

  const formHidden = presentation !== null && !formOpen;

  return (
    <div className="flex flex-col gap-7">
      <section className="flex flex-col items-center gap-3 px-2 pt-2 pb-1 text-center sm:pt-4">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MonitorPlay className="size-5" aria-hidden="true" />
        </span>
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">{copy.hero.eyebrow}</p>
        <h1 className="text-balance text-2xl leading-snug font-semibold tracking-tight text-foreground sm:text-3xl">{copy.pageTitle}</h1>
        <p className="max-w-xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">{copy.pageHelperText}</p>
        <div className="mt-1 flex flex-wrap justify-center gap-1.5">
          {copy.hero.highlights.map((highlight) => (
            <Badge key={highlight} variant="secondary" className="rounded-full px-2.5 py-1 font-medium">
              {highlight}
            </Badge>
          ))}
        </div>
      </section>

      {feedback ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium",
            feedback.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
          )}
        >
          {feedback.type === "success" ? <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" /> : <XCircle className="size-4 shrink-0" aria-hidden="true" />}
          {feedback.message}
        </div>
      ) : null}

      {presentation ? (
        <div className="-mb-3 flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={() => setFormOpen((prev) => !prev)} aria-expanded={!formHidden} className="gap-1.5 text-muted-foreground">
            {formHidden ? <PanelLeftOpen className="size-4" aria-hidden="true" /> : <PanelLeftClose className="size-4" aria-hidden="true" />}
            {formHidden ? copy.preview.showForm : copy.preview.hideForm}
          </Button>
        </div>
      ) : null}

      <div className={cn("grid grid-cols-1 items-start gap-5 lg:gap-6", !formHidden && "lg:grid-cols-[minmax(0,380px)_1fr]")}>
        <Card className={cn("gap-0 p-4 ring-foreground/8 lg:sticky lg:top-20 lg:p-5", formHidden && "hidden")}>
          <PresentationForm
            t={t}
            form={form}
            errors={errors}
            status={status}
            onFieldChange={generator.updateField}
            onSelectTopic={generator.selectTopic}
            onFreeTopic={generator.setFreeTopic}
            onToggleOutcome={generator.toggleOutcome}
            onSetOutcomes={generator.setOutcomes}
            onSubmit={handleGenerate}
          />
        </Card>
        <div className="min-w-0">
          <PresentationPreview
            t={t}
            status={status}
            loadingStage={loadingStage}
            presentation={presentation}
            index={Math.min(index, (presentation?.slides.length ?? 1) - 1)}
            onIndexChange={setIndex}
            imageFor={images.stateFor}
            onNextImage={images.nextImage}
            onToggleImage={images.toggleRemoved}
            onOpenBoard={() => setBoardOpen(true)}
            onExport={handleExport}
            exporting={exporting}
            onRegenerate={handleGenerate}
          />
        </div>
      </div>

      {boardOpen && presentation ? (
        <SmartBoard
          t={t}
          presentation={presentation}
          index={Math.min(index, presentation.slides.length - 1)}
          onIndexChange={setIndex}
          imageFor={images.stateFor}
          onClose={() => setBoardOpen(false)}
          onFullscreenUnavailable={() => showFeedback({ type: "error", message: copy.feedback.fullscreenUnavailable })}
        />
      ) : null}
    </div>
  );
}
