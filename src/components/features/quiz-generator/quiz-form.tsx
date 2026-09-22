"use client";

import * as React from "react";
import { Check, ChevronDown, ClipboardList, Loader2, Sparkles } from "lucide-react";

import { LessonPlanField } from "@/components/features/lesson-planner/lesson-plan-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/types/i18n";
import {
  COGNITIVE_LEVELS,
  DIFFICULTY_LEVELS,
  QUESTION_APPROACHES,
  QUESTION_TYPES,
  QUIZ_TYPES,
  VISUAL_TYPES,
  VISUAL_USAGE_OPTIONS,
} from "@/types/quiz-generator";
import type {
  QuestionType,
  QuizFormErrors,
  QuizFormInput,
  QuizGenerationStatus,
  VisualType,
} from "@/types/quiz-generator";

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

interface ToggleChipGroupProps<T extends string> {
  values: readonly T[];
  selected: T[];
  labels: Record<T, string>;
  onToggle: (value: T) => void;
}

function ToggleChipGroup<T extends string>({ values, selected, labels, onToggle }: ToggleChipGroupProps<T>) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {values.map((value) => {
        const active = selected.includes(value);
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(value)}
            className={cn(
              "group flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-all duration-150",
              active
                ? "border-primary/40 bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-foreground hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
            )}
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-md transition-colors",
                active ? "bg-white/15 text-primary-foreground" : "bg-primary/10 text-primary"
              )}
            >
              {active ? <Check className="size-3.5" aria-hidden="true" /> : null}
            </span>
            <span className="leading-snug">{labels[value]}</span>
          </button>
        );
      })}
    </div>
  );
}

interface QuizFormProps {
  t: Dictionary;
  form: QuizFormInput;
  errors: QuizFormErrors;
  status: QuizGenerationStatus;
  onFieldChange: <K extends keyof QuizFormInput>(key: K, value: QuizFormInput[K]) => void;
  onToggleQuestionType: (type: QuestionType) => void;
  onToggleVisualType: (type: VisualType) => void;
  onSubmit: () => void;
}

export function QuizForm({
  t,
  form,
  errors,
  status,
  onFieldChange,
  onToggleQuestionType,
  onToggleVisualType,
  onSubmit,
}: QuizFormProps) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const copy = t.quizGenerator.form;
  const labels = t.quizGenerator.labels;
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
            <ClipboardList className="size-3.5" aria-hidden="true" />
          </span>
          <h2 className="text-[0.95rem] font-semibold tracking-tight text-foreground">{copy.essentialTitle}</h2>
        </div>

        <LessonPlanField id="qz-quiz-type" label={copy.fields.quizType.label}>
          <select
            id="qz-quiz-type"
            value={form.quizType}
            onChange={(event) => onFieldChange("quizType", event.target.value as QuizFormInput["quizType"])}
            className={selectClassName}
          >
            {QUIZ_TYPES.map((type) => (
              <option key={type} value={type}>
                {labels.quizTypes[type]}
              </option>
            ))}
          </select>
        </LessonPlanField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LessonPlanField id="qz-subject" label={copy.fields.subject.label} required error={errors.subject}>
            <Input
              id="qz-subject"
              value={form.subject}
              onChange={(event) => onFieldChange("subject", event.target.value)}
              placeholder={copy.fields.subject.placeholder}
              aria-invalid={Boolean(errors.subject)}
              aria-describedby={errors.subject ? "qz-subject-error" : undefined}
            />
          </LessonPlanField>

          <LessonPlanField id="qz-grade" label={copy.fields.gradeLevel.label} required error={errors.gradeLevel}>
            <Input
              id="qz-grade"
              value={form.gradeLevel}
              onChange={(event) => onFieldChange("gradeLevel", event.target.value)}
              placeholder={copy.fields.gradeLevel.placeholder}
              aria-invalid={Boolean(errors.gradeLevel)}
              aria-describedby={errors.gradeLevel ? "qz-grade-error" : undefined}
            />
          </LessonPlanField>
        </div>

        <LessonPlanField id="qz-topic" label={copy.fields.topic.label} required error={errors.topic}>
          <Input
            id="qz-topic"
            value={form.topic}
            onChange={(event) => onFieldChange("topic", event.target.value)}
            placeholder={copy.fields.topic.placeholder}
            aria-invalid={Boolean(errors.topic)}
            aria-describedby={errors.topic ? "qz-topic-error" : undefined}
          />
        </LessonPlanField>

        <LessonPlanField id="qz-objectives" label={copy.fields.objectives.label} required error={errors.objectives}>
          <Textarea
            id="qz-objectives"
            value={form.objectives}
            onChange={(event) => onFieldChange("objectives", event.target.value)}
            placeholder={copy.fields.objectives.placeholder}
            rows={3}
            aria-invalid={Boolean(errors.objectives)}
            aria-describedby={errors.objectives ? "qz-objectives-error" : undefined}
          />
        </LessonPlanField>

        <LessonPlanField
          id="qz-question-count"
          label={copy.fields.questionCount.label}
          required
          error={errors.questionCount}
        >
          <Input
            id="qz-question-count"
            type="number"
            min={1}
            max={50}
            value={form.questionCount}
            onChange={(event) => onFieldChange("questionCount", Number(event.target.value))}
            placeholder={copy.fields.questionCount.placeholder}
            aria-invalid={Boolean(errors.questionCount)}
            aria-describedby={errors.questionCount ? "qz-question-count-error" : undefined}
          />
        </LessonPlanField>
      </div>

      <div className="flex flex-col gap-2.5 rounded-xl bg-primary/[0.04] p-3.5 ring-1 ring-primary/10">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">{copy.questionTypesLabel}</p>
        </div>
        <p className="text-xs text-muted-foreground">{copy.questionTypesDescription}</p>
        <ToggleChipGroup
          values={QUESTION_TYPES}
          selected={form.questionTypes}
          labels={labels.questionTypes}
          onToggle={onToggleQuestionType}
        />
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
              <LessonPlanField id="qz-approach" label={copy.questionApproachLabel}>
                <select
                  id="qz-approach"
                  value={form.questionApproach}
                  onChange={(event) =>
                    onFieldChange("questionApproach", event.target.value as QuizFormInput["questionApproach"])
                  }
                  className={selectClassName}
                >
                  {QUESTION_APPROACHES.map((approach) => (
                    <option key={approach} value={approach}>
                      {labels.questionApproaches[approach]}
                    </option>
                  ))}
                </select>
              </LessonPlanField>

              <LessonPlanField id="qz-cognitive-level" label={copy.cognitiveLevelLabel}>
                <select
                  id="qz-cognitive-level"
                  value={form.cognitiveLevel}
                  onChange={(event) =>
                    onFieldChange("cognitiveLevel", event.target.value as QuizFormInput["cognitiveLevel"])
                  }
                  className={selectClassName}
                >
                  {COGNITIVE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {labels.cognitiveLevels[level]}
                    </option>
                  ))}
                </select>
              </LessonPlanField>
            </div>

            <LessonPlanField id="qz-difficulty" label={copy.difficultyLabel}>
              <select
                id="qz-difficulty"
                value={form.difficulty}
                onChange={(event) => onFieldChange("difficulty", event.target.value as QuizFormInput["difficulty"])}
                className={selectClassName}
              >
                {[...DIFFICULTY_LEVELS, "mixed" as const].map((level) => (
                  <option key={level} value={level}>
                    {labels.difficultyLevels[level]}
                  </option>
                ))}
              </select>
            </LessonPlanField>

            <LessonPlanField id="qz-visual-usage" label={copy.visualUsageLabel}>
              <select
                id="qz-visual-usage"
                value={form.visualUsage}
                onChange={(event) => onFieldChange("visualUsage", event.target.value as QuizFormInput["visualUsage"])}
                className={selectClassName}
              >
                {VISUAL_USAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {labels.visualUsageOptions[option]}
                  </option>
                ))}
              </select>
            </LessonPlanField>

            {form.visualUsage !== "none" ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-foreground">{copy.visualTypesLabel}</p>
                <p className="text-xs text-muted-foreground">{copy.visualTypesDescription}</p>
                <ToggleChipGroup
                  values={VISUAL_TYPES}
                  selected={form.visualTypes}
                  labels={labels.visualTypes}
                  onToggle={onToggleVisualType}
                />
              </div>
            ) : null}

            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={form.includeAnswerKey}
                onChange={(event) => onFieldChange("includeAnswerKey", event.target.checked)}
                className="size-4 rounded border-input accent-primary"
              />
              {copy.includeAnswerKeyLabel}
            </label>

            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={form.includeExplanations}
                onChange={(event) => onFieldChange("includeExplanations", event.target.checked)}
                className="size-4 rounded border-input accent-primary"
              />
              {copy.includeExplanationsLabel}
            </label>
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
