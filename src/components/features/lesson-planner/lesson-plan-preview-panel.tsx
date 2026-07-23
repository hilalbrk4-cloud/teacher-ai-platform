import { CheckCircle2, ClipboardList, Sparkles } from "lucide-react";

import { LessonPlanContinueWithAi } from "@/components/features/lesson-planner/lesson-plan-continue-with-ai";
import { LessonPlanLoadingState } from "@/components/features/lesson-planner/lesson-plan-loading-state";
import { LessonPlanQualityCard } from "@/components/features/lesson-planner/lesson-plan-quality-card";
import { LessonPlanSectionBlock } from "@/components/features/lesson-planner/lesson-plan-section";
import { SectionTitle } from "@/components/shared/section-title";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/types/i18n";
import { LESSON_PLAN_SECTION_ORDER } from "@/types/lesson-planner";
import type {
  LessonPlan,
  LessonPlanFormInput,
  LessonPlanGenerationStatus,
  LessonPlanSectionKey,
} from "@/types/lesson-planner";

interface LessonPlanPreviewPanelProps {
  t: Dictionary;
  form: LessonPlanFormInput;
  status: LessonPlanGenerationStatus;
  loadingStage: number;
  plan: LessonPlan | null;
  isEditMode: boolean;
  isSaved: boolean;
  onSectionChange: (key: LessonPlanSectionKey, value: string) => void;
  onCopySection: (key: LessonPlanSectionKey) => void;
}

export function LessonPlanPreviewPanel({
  t,
  form,
  status,
  loadingStage,
  plan,
  isEditMode,
  isSaved,
  onSectionChange,
  onCopySection,
}: LessonPlanPreviewPanelProps) {
  const preview = t.lessonPlanner.preview;
  const hasStartedFilling = Boolean(form.subject.trim() || form.gradeLevel.trim() || form.topic.trim());

  if (plan && (status === "success" || status === "loading")) {
    const isRegenerating = status === "loading";

    return (
      <div className="flex flex-col gap-4">
        <Card
          id="lesson-plan-print-area"
          className="flex flex-col gap-4 overflow-hidden p-0 animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3.5 lg:px-5">
            <SectionTitle title={`${plan.topic}`} description={`${plan.subject} · ${plan.gradeLevel}`} />
            <Badge
              variant="outline"
              className={
                isSaved
                  ? "border-transparent bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "border-border text-muted-foreground"
              }
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="size-3" aria-hidden="true" />
                  {t.lessonPlanner.result.statusSaved}
                </>
              ) : (
                t.lessonPlanner.result.statusDraft
              )}
            </Badge>
          </div>

          <div className="flex flex-col gap-4 px-4 pb-4 lg:px-5 lg:pb-5">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{preview.summaryDuration(plan.duration)}</Badge>
            </div>

            {isRegenerating ? (
              <LessonPlanLoadingState
                message={t.lessonPlanner.loadingMessages[loadingStage]}
                stage={loadingStage}
                totalStages={t.lessonPlanner.loadingMessages.length}
              />
            ) : null}

            <div
              className={cn(
                "flex flex-col gap-3 transition-opacity duration-300",
                isRegenerating && "pointer-events-none opacity-50"
              )}
              aria-hidden={isRegenerating}
            >
              {plan.sections.map((section, index) => (
                <LessonPlanSectionBlock
                  key={section.key}
                  index={index + 1}
                  title={t.lessonPlanner.sections[section.key]}
                  content={section.content}
                  state="result"
                  editable={isEditMode && !isRegenerating}
                  onChange={(value) => onSectionChange(section.key, value)}
                  onCopy={() => onCopySection(section.key)}
                  copyLabel={t.lessonPlanner.result.actions.copySection}
                />
              ))}
            </div>
          </div>
        </Card>

        {!isRegenerating ? (
          <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 print:hidden">
            <LessonPlanQualityCard t={t} plan={plan} />
          </div>
        ) : null}

        <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 print:hidden">
          <LessonPlanContinueWithAi t={t} />
        </div>
      </div>
    );
  }

  return (
    <Card className="flex flex-col gap-4 overflow-hidden p-0">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3.5 lg:px-5">
        <SectionTitle title={preview.title} />
        <Badge
          variant="outline"
          className="gap-1.5 border-transparent bg-primary/10 text-primary"
        >
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
          </span>
          {preview.liveBadge}
        </Badge>
      </div>

      <div className="flex flex-col gap-4 px-4 pb-4 lg:px-5 lg:pb-5">
        {status === "loading" ? (
          <LessonPlanLoadingState
            message={t.lessonPlanner.loadingMessages[loadingStage]}
            stage={loadingStage}
            totalStages={t.lessonPlanner.loadingMessages.length}
          />
        ) : null}

        <div className={cn("flex flex-col gap-3", status === "loading" && "pointer-events-none opacity-60")}>
          {hasStartedFilling ? (
            <div className="flex flex-wrap gap-1.5 rounded-lg bg-muted/50 p-2.5 animate-in fade-in-0 duration-200">
              {form.subject.trim() ? <Badge variant="secondary">{form.subject}</Badge> : null}
              {form.gradeLevel.trim() ? <Badge variant="secondary">{form.gradeLevel}</Badge> : null}
              {form.topic.trim() ? <Badge variant="secondary">{form.topic}</Badge> : null}
              <Badge variant="secondary">{preview.summaryDuration(form.duration)}</Badge>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-lg border border-dashed border-border px-3.5 py-3 animate-in fade-in-0 duration-200">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="size-3.5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{preview.emptyTitle}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{preview.emptyDescription}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ClipboardList className="size-3.5" aria-hidden="true" />
            {preview.structureHint}
          </div>

          <div className="flex flex-col gap-2.5">
            {LESSON_PLAN_SECTION_ORDER.map((key, index) => (
              <LessonPlanSectionBlock
                key={key}
                index={index + 1}
                title={t.lessonPlanner.sections[key]}
                state={status === "loading" ? "loading" : "outline"}
                pendingText={preview.sectionPendingText}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
