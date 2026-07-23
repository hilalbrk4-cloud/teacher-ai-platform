"use client";

import { CheckCircle2, Sparkles, XCircle } from "lucide-react";

import { LessonPlanActionBar } from "@/components/features/lesson-planner/lesson-plan-action-bar";
import { LessonPlanForm } from "@/components/features/lesson-planner/lesson-plan-form";
import { LessonPlanPreviewPanel } from "@/components/features/lesson-planner/lesson-plan-preview-panel";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useLessonPlanGenerator } from "@/hooks/use-lesson-plan-generator";
import { useTranslations } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils";

export function LessonPlannerWorkspace() {
  const t = useTranslations();
  const {
    form,
    errors,
    status,
    loadingStage,
    plan,
    savedDocument,
    isEditMode,
    feedback,
    updateField,
    toggleRefinement,
    generate,
    regenerate,
    updateSectionContent,
    toggleEditMode,
    copySectionContent,
    copyPlan,
    shorten,
    expand,
    save,
    duplicate,
  } = useLessonPlanGenerator(t);

  const hasPlan = status === "success" || (status === "loading" && plan !== null);
  const hero = t.lessonPlanner.hero;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex flex-col gap-7">
      <section className="flex flex-col items-center gap-3 px-2 pt-2 pb-1 text-center sm:pt-4 print:hidden">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="size-5" aria-hidden="true" />
        </span>

        <p className="text-xs font-semibold tracking-wide text-primary uppercase">{hero.eyebrow}</p>

        <h1 className="text-balance text-2xl leading-snug font-semibold tracking-tight text-foreground sm:text-3xl">
          {t.lessonPlanner.pageTitle}
        </h1>
        <p className="max-w-xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
          {t.lessonPlanner.pageHelperText}
        </p>

        <div className="mt-1 flex flex-wrap justify-center gap-1.5">
          {hero.highlights.map((highlight) => (
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
            "flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium print:hidden",
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "bg-destructive/10 text-destructive"
          )}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="size-4 shrink-0" aria-hidden="true" />
          )}
          {feedback.message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-5 print:block lg:grid-cols-[minmax(0,380px)_1fr] lg:gap-6">
        <Card className="gap-0 p-4 ring-foreground/8 print:hidden lg:sticky lg:top-6 lg:p-5">
          <LessonPlanForm
            t={t}
            form={form}
            errors={errors}
            status={status}
            onFieldChange={updateField}
            onToggleRefinement={toggleRefinement}
            onSubmit={generate}
          />
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <LessonPlanPreviewPanel
            t={t}
            form={form}
            status={status}
            loadingStage={loadingStage}
            plan={plan}
            isEditMode={isEditMode}
            isSaved={savedDocument?.status === "saved"}
            onSectionChange={updateSectionContent}
            onCopySection={copySectionContent}
          />

          {hasPlan && plan ? (
            <div className="print:hidden">
              <LessonPlanActionBar
                t={t}
                isEditMode={isEditMode}
                isRegenerating={status === "loading"}
                onToggleEdit={toggleEditMode}
                onSave={save}
                onCopyAll={copyPlan}
                onPrint={handlePrint}
                onRegenerate={regenerate}
                onShorten={shorten}
                onExpand={expand}
                onDuplicate={duplicate}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
