"use client";

import { BookOpen, Compass, Landmark, LayoutTemplate, Loader2, MessagesSquare, Repeat2, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { CurriculumOutcomePicker } from "@/components/features/curriculum/curriculum-outcome-picker";
import { CurriculumTopicCombobox } from "@/components/features/curriculum/curriculum-topic-combobox";
import { LessonPlanField } from "@/components/features/lesson-planner/lesson-plan-field";
import { RubricChoiceGroup } from "@/components/features/rubric-generator/rubric-choice-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurriculumGrade } from "@/hooks/use-curriculum-grade";
import { CURRICULUM_SUBJECTS, curriculumGradeOptions, findCurriculumEntry } from "@/lib/curriculum/catalog";
import type { CurriculumOutcome } from "@/types/curriculum";
import type { Dictionary } from "@/types/i18n";
import {
  PRESENTATION_TYPES,
  type PresentationFormErrors,
  type PresentationFormInput,
  type PresentationGenerationStatus,
  type PresentationType,
  type SlideCount,
} from "@/types/presentation";

const TYPE_ICONS: Record<PresentationType, LucideIcon> = { yeniKonu: Compass, pekistirme: Repeat2, tartisma: MessagesSquare };

interface PresentationFormProps {
  t: Dictionary;
  form: PresentationFormInput;
  errors: PresentationFormErrors;
  status: PresentationGenerationStatus;
  onFieldChange: <K extends keyof PresentationFormInput>(key: K, value: PresentationFormInput[K]) => void;
  onSelectTopic: (selection: { gradeId: string; unitId: string; topicId: string; topicName: string; outcomeCodes: string[] }) => void;
  onFreeTopic: (topic: string) => void;
  onToggleOutcome: (outcome: CurriculumOutcome) => void;
  onSetOutcomes: (outcomes: CurriculumOutcome[]) => void;
  onSubmit: () => void;
}

export function PresentationForm({
  t,
  form,
  errors,
  status,
  onFieldChange,
  onSelectTopic,
  onFreeTopic,
  onToggleOutcome,
  onSetOutcomes,
  onSubmit,
}: PresentationFormProps) {
  const copy = t.presentationBuilder.form;
  const curriculumCopy = t.curriculum;
  const loading = status === "loading";
  const entry = findCurriculumEntry(form.subject, form.gradeLevel);
  const grade = useCurriculumGrade(entry?.id);
  const gradeData = grade.status === "ready" ? grade.data : undefined;
  const selection = form.curriculum && gradeData?.id === form.curriculum.gradeId ? form.curriculum : null;
  const unit = selection ? gradeData?.units.find((item) => item.id === selection.unitId) : undefined;
  const topic = selection ? unit?.topics.find((item) => item.id === selection.topicId) : undefined;
  const topicHint =
    grade.status === "loading"
      ? curriculumCopy.topicLoading
      : grade.status === "error"
        ? curriculumCopy.topicLoadError
        : form.subject.trim() && form.gradeLevel.trim() && !entry
          ? curriculumCopy.noCurriculumHint
          : undefined;

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {Object.keys(errors).length > 0 ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LessonPlanField id="pb-subject" label={copy.fields.subject.label} required error={errors.subject}>
            <Input
              id="pb-subject"
              value={form.subject}
              list="pb-subject-options"
              autoComplete="off"
              placeholder={copy.fields.subject.placeholder}
              aria-invalid={Boolean(errors.subject)}
              aria-describedby={errors.subject ? "pb-subject-error" : undefined}
              onChange={(event) => onFieldChange("subject", event.target.value)}
            />
            <datalist id="pb-subject-options">
              {CURRICULUM_SUBJECTS.map((subject) => (
                <option key={subject} value={subject} />
              ))}
            </datalist>
          </LessonPlanField>
          <LessonPlanField id="pb-grade" label={copy.fields.gradeLevel.label} required error={errors.gradeLevel}>
            <Input
              id="pb-grade"
              value={form.gradeLevel}
              list="pb-grade-options"
              autoComplete="off"
              placeholder={copy.fields.gradeLevel.placeholder}
              aria-invalid={Boolean(errors.gradeLevel)}
              aria-describedby={errors.gradeLevel ? "pb-grade-error" : undefined}
              onChange={(event) => onFieldChange("gradeLevel", event.target.value)}
            />
            <datalist id="pb-grade-options">
              {curriculumGradeOptions(form.subject).map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </LessonPlanField>
        </div>

        <LessonPlanField id="pb-topic" label={copy.fields.topic.label} required error={errors.topic} hint={topicHint}>
          {gradeData ? (
            <CurriculumTopicCombobox
              t={t}
              id="pb-topic"
              grade={gradeData}
              value={form.topic}
              selectedTopicId={topic?.id}
              invalid={Boolean(errors.topic)}
              describedBy={errors.topic ? "pb-topic-error" : undefined}
              onSelect={(selectedUnit, selectedTopic) =>
                onSelectTopic({
                  gradeId: gradeData.id,
                  unitId: selectedUnit.id,
                  topicId: selectedTopic.id,
                  topicName: selectedTopic.name,
                  outcomeCodes: selectedTopic.outcomeCodes,
                })
              }
              onFreeText={onFreeTopic}
            />
          ) : (
            <Input
              id="pb-topic"
              value={form.topic}
              placeholder={copy.fields.topic.placeholder}
              aria-invalid={Boolean(errors.topic)}
              aria-describedby={errors.topic ? "pb-topic-error" : undefined}
              onChange={(event) => onFieldChange("topic", event.target.value)}
            />
          )}
        </LessonPlanField>

        {gradeData && unit && topic && selection ? (
          <CurriculumOutcomePicker
            t={t}
            grade={gradeData}
            unit={unit}
            topic={topic}
            selectedCodes={selection.outcomeCodes}
            onToggle={onToggleOutcome}
            onSetAll={onSetOutcomes}
            description={copy.outcomesDescription}
            autoIncludedTitle={copy.outcomesAutoTitle}
          />
        ) : (
          <p className="flex items-start gap-1.5 rounded-lg bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            <Landmark className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
            {copy.noCurriculumHint}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LayoutTemplate className="size-3.5" aria-hidden="true" />
          </span>
          <h2 className="text-[0.95rem] font-semibold tracking-tight text-foreground">{copy.formatTitle}</h2>
        </div>
        <RubricChoiceGroup<PresentationType>
          label={copy.typeLabel}
          value={form.type}
          onChange={(value) => onFieldChange("type", value)}
          columns="grid-cols-1"
          options={PRESENTATION_TYPES.map((value) => ({ value, icon: TYPE_ICONS[value], ...copy.types[value] }))}
        />
        <RubricChoiceGroup<"5" | "8">
          label={copy.slideCountLabel}
          value={String(form.slideCount) as "5" | "8"}
          onChange={(value) => onFieldChange("slideCount", Number(value) as SlideCount)}
          columns="grid-cols-2"
          options={(["5", "8"] as const).map((value) => ({ value, ...copy.slideCounts[value] }))}
        />
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="h-12 w-full gap-1.5 rounded-xl text-[0.95rem] shadow-md shadow-primary/15 transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.99] disabled:opacity-100"
        >
          {loading ? copy.submitLoading : copy.submit}
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{copy.submitCaption}</p>
      </div>
    </form>
  );
}
