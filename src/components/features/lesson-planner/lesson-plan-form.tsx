"use client";

import * as React from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  Flame,
  HeartHandshake,
  Layers,
  Loader2,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { LessonPlanField } from "@/components/features/lesson-planner/lesson-plan-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/types/i18n";
import type {
  LessonPlanFormErrors,
  LessonPlanFormInput,
  LessonPlanGenerationStatus,
  LessonPlanRefinementId,
} from "@/types/lesson-planner";

const DURATION_OPTIONS = [30, 40, 45, 50, 60, 80];

const REFINEMENT_ICONS: Record<LessonPlanRefinementId, LucideIcon> = {
  fiveE: Layers,
  groupWork: Users,
  warmUpActivity: Flame,
  inclusionAdaptation: HeartHandshake,
};

const REFINEMENT_IDS: LessonPlanRefinementId[] = [
  "fiveE",
  "groupWork",
  "warmUpActivity",
  "inclusionAdaptation",
];

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

interface LessonPlanFormProps {
  t: Dictionary;
  form: LessonPlanFormInput;
  errors: LessonPlanFormErrors;
  status: LessonPlanGenerationStatus;
  onFieldChange: <K extends keyof LessonPlanFormInput>(key: K, value: LessonPlanFormInput[K]) => void;
  onToggleRefinement: (id: LessonPlanRefinementId) => void;
  onSubmit: () => void;
}

export function LessonPlanForm({
  t,
  form,
  errors,
  status,
  onFieldChange,
  onToggleRefinement,
  onSubmit,
}: LessonPlanFormProps) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const copy = t.lessonPlanner.form;
  const isLoading = status === "loading";
  const hasErrors = Object.keys(errors).length > 0;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {hasErrors ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive"
        >
          {copy.validationBanner}
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpen className="size-3.5" aria-hidden="true" />
          </span>
          <h2 className="text-[0.95rem] font-semibold tracking-tight text-foreground">{copy.essentialTitle}</h2>
        </div>

        <LessonPlanField id="lp-subject" label={copy.fields.subject.label} required error={errors.subject}>
          <Input
            id="lp-subject"
            value={form.subject}
            onChange={(event) => onFieldChange("subject", event.target.value)}
            placeholder={copy.fields.subject.placeholder}
            aria-invalid={Boolean(errors.subject)}
            aria-describedby={errors.subject ? "lp-subject-error" : undefined}
          />
        </LessonPlanField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LessonPlanField id="lp-grade" label={copy.fields.gradeLevel.label} required error={errors.gradeLevel}>
            <Input
              id="lp-grade"
              value={form.gradeLevel}
              onChange={(event) => onFieldChange("gradeLevel", event.target.value)}
              placeholder={copy.fields.gradeLevel.placeholder}
              aria-invalid={Boolean(errors.gradeLevel)}
              aria-describedby={errors.gradeLevel ? "lp-grade-error" : undefined}
            />
          </LessonPlanField>

          <LessonPlanField id="lp-duration" label={copy.fields.duration.label} required error={errors.duration}>
            <select
              id="lp-duration"
              value={form.duration}
              onChange={(event) => onFieldChange("duration", Number(event.target.value))}
              aria-invalid={Boolean(errors.duration)}
              aria-describedby={errors.duration ? "lp-duration-error" : undefined}
              className={selectClassName}
            >
              {DURATION_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} dk
                </option>
              ))}
            </select>
          </LessonPlanField>
        </div>

        <LessonPlanField id="lp-topic" label={copy.fields.topic.label} required error={errors.topic}>
          <Input
            id="lp-topic"
            value={form.topic}
            onChange={(event) => onFieldChange("topic", event.target.value)}
            placeholder={copy.fields.topic.placeholder}
            aria-invalid={Boolean(errors.topic)}
            aria-describedby={errors.topic ? "lp-topic-error" : undefined}
          />
        </LessonPlanField>

        <LessonPlanField id="lp-objectives" label={copy.fields.objectives.label} required error={errors.objectives}>
          <Textarea
            id="lp-objectives"
            value={form.objectives}
            onChange={(event) => onFieldChange("objectives", event.target.value)}
            placeholder={copy.fields.objectives.placeholder}
            rows={3}
            aria-invalid={Boolean(errors.objectives)}
            aria-describedby={errors.objectives ? "lp-objectives-error" : undefined}
          />
        </LessonPlanField>
      </div>

      <div className="flex flex-col gap-2.5 rounded-xl bg-primary/[0.04] p-3.5 ring-1 ring-primary/10">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">{copy.refinementsTitle}</p>
        </div>
        <p className="text-xs text-muted-foreground">{copy.refinementsDescription}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {REFINEMENT_IDS.map((id) => {
            const active = form.refinements.includes(id);
            const Icon = REFINEMENT_ICONS[id];
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => onToggleRefinement(id)}
                className={cn(
                  "group flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-all duration-150",
                  active
                    ? "border-primary/40 bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-md transition-colors",
                    active ? "bg-white/15 text-primary-foreground" : "bg-primary/10 text-primary"
                  )}
                >
                  {active ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Icon className="size-3.5" aria-hidden="true" />
                  )}
                </span>
                <span className="leading-snug">{copy.refinements[id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced((prev) => !prev)}
          aria-expanded={showAdvanced}
          className="w-fit gap-1.5 text-muted-foreground"
        >
          <ChevronDown
            className={cn("size-4 transition-transform duration-200", showAdvanced && "rotate-180")}
            aria-hidden="true"
          />
          {showAdvanced ? copy.advancedToggleHide : copy.advancedToggleShow}
        </Button>

        {showAdvanced ? (
          <div className="flex flex-col gap-4 rounded-lg bg-muted/40 p-3.5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LessonPlanField id="lp-approach" label={copy.fields.teachingApproach.label}>
                <Input
                  id="lp-approach"
                  value={form.teachingApproach}
                  onChange={(event) => onFieldChange("teachingApproach", event.target.value)}
                  placeholder={copy.fields.teachingApproach.placeholder}
                />
              </LessonPlanField>
              <LessonPlanField id="lp-student-level" label={copy.fields.studentLevel.label}>
                <Input
                  id="lp-student-level"
                  value={form.studentLevel}
                  onChange={(event) => onFieldChange("studentLevel", event.target.value)}
                  placeholder={copy.fields.studentLevel.placeholder}
                />
              </LessonPlanField>
            </div>

            <LessonPlanField id="lp-materials" label={copy.fields.materials.label}>
              <Textarea
                id="lp-materials"
                value={form.materials}
                onChange={(event) => onFieldChange("materials", event.target.value)}
                placeholder={copy.fields.materials.placeholder}
                rows={2}
              />
            </LessonPlanField>

            <LessonPlanField id="lp-assessment" label={copy.fields.assessmentPreference.label}>
              <Input
                id="lp-assessment"
                value={form.assessmentPreference}
                onChange={(event) => onFieldChange("assessmentPreference", event.target.value)}
                placeholder={copy.fields.assessmentPreference.placeholder}
              />
            </LessonPlanField>

            <LessonPlanField id="lp-special-needs" label={copy.fields.specialNeeds.label}>
              <Textarea
                id="lp-special-needs"
                value={form.specialNeeds}
                onChange={(event) => onFieldChange("specialNeeds", event.target.value)}
                placeholder={copy.fields.specialNeeds.placeholder}
                rows={2}
              />
            </LessonPlanField>

            <LessonPlanField id="lp-notes" label={copy.fields.additionalNotes.label}>
              <Textarea
                id="lp-notes"
                value={form.additionalNotes}
                onChange={(event) => onFieldChange("additionalNotes", event.target.value)}
                placeholder={copy.fields.additionalNotes.placeholder}
                rows={2}
              />
            </LessonPlanField>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <Button
          type="submit"
          size="lg"
          disabled={isLoading}
          className="h-12 w-full gap-1.5 rounded-xl text-[0.95rem] shadow-md shadow-primary/15 transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.99] disabled:opacity-100"
        >
          {isLoading ? (
            <>
              {copy.submitLoading}
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            </>
          ) : (
            <>
              {copy.submit}
              <Sparkles className="size-4" aria-hidden="true" />
            </>
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{copy.submitCaption}</p>
      </div>
    </form>
  );
}
