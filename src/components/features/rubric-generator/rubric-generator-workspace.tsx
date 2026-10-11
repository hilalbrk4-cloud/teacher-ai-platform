"use client";

import * as React from "react";
import { CheckCircle2, ClipboardCheck, PanelLeftClose, PanelLeftOpen, XCircle } from "lucide-react";

import { RubricActionBar } from "@/components/features/rubric-generator/rubric-action-bar";
import { RubricForm } from "@/components/features/rubric-generator/rubric-form";
import { RubricPreviewPanel, type RubricView } from "@/components/features/rubric-generator/rubric-preview-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useRubricGenerator } from "@/hooks/use-rubric-generator";
import { useTranslations } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils";

export function RubricGeneratorWorkspace() {
  const t = useTranslations();
  const copy = t.rubricGenerator;
  const {
    form,
    errors,
    status,
    loadingStage,
    rubric,
    exporting,
    feedback,
    updateField,
    selectCurriculumTopic,
    setFreeTopic,
    toggleOutcome,
    setOutcomes,
    generate,
    exportDocx,
  } = useRubricGenerator(t);
  const [view, setView] = React.useState<RubricView>("teacher");
  const [showFormInLive, setShowFormInLive] = React.useState(false);
  // Canlı Değerlendirme iki sütunlu (öğrenci listesi + puanlama) olduğundan form gizlenir ve önizleme tam genişliğe geçer.
  const isLive = view === "live" && rubric !== null;
  const formHidden = isLive && !showFormInLive;

  return (
    <div className="flex flex-col gap-7">
      <section className="flex flex-col items-center gap-3 px-2 pt-2 pb-1 text-center sm:pt-4">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ClipboardCheck className="size-5" aria-hidden="true" />
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
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "bg-destructive/10 text-destructive"
          )}
        >
          {feedback.type === "success" ? <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" /> : <XCircle className="size-4 shrink-0" aria-hidden="true" />}
          {feedback.message}
        </div>
      ) : null}

      {isLive ? (
        <div className="-mb-3 flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowFormInLive((prev) => !prev)} aria-expanded={!formHidden} className="gap-1.5 text-muted-foreground">
            {formHidden ? <PanelLeftOpen className="size-4" aria-hidden="true" /> : <PanelLeftClose className="size-4" aria-hidden="true" />}
            {formHidden ? copy.live.showForm : copy.live.hideForm}
          </Button>
        </div>
      ) : null}

      <div className={cn("grid grid-cols-1 items-start gap-5 lg:gap-6", !formHidden && "lg:grid-cols-[minmax(0,380px)_1fr]")}>
        <Card className={cn("gap-0 p-4 ring-foreground/8 lg:sticky lg:top-6 lg:p-5", formHidden && "hidden")}>
          <RubricForm
            t={t}
            form={form}
            errors={errors}
            status={status}
            onFieldChange={updateField}
            onSelectTopic={selectCurriculumTopic}
            onFreeTopic={setFreeTopic}
            onToggleOutcome={toggleOutcome}
            onSetOutcomes={setOutcomes}
            onSubmit={generate}
          />
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <RubricPreviewPanel t={t} status={status} loadingStage={loadingStage} rubric={rubric} view={view} onViewChange={setView} />
          {rubric && !isLive ? (
            <RubricActionBar t={t} isRegenerating={status === "loading"} exporting={exporting} onExport={exportDocx} onRegenerate={generate} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
