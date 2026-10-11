"use client";

import {
  BookOpen,
  ClipboardCheck,
  FlaskConical,
  FolderKanban,
  FolderOpen,
  Landmark,
  Layers,
  Loader2,
  Presentation,
  Sparkles,
  Users,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { CurriculumOutcomePicker } from "@/components/features/curriculum/curriculum-outcome-picker";
import { CurriculumTopicCombobox } from "@/components/features/curriculum/curriculum-topic-combobox";
import { LessonPlanField } from "@/components/features/lesson-planner/lesson-plan-field";
import { RubricChoiceGroup } from "@/components/features/rubric-generator/rubric-choice-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCurriculumGrade } from "@/hooks/use-curriculum-grade";
import { CURRICULUM_SUBJECTS, curriculumGradeOptions, findCurriculumEntry } from "@/lib/curriculum/catalog";
import type { CurriculumOutcome } from "@/types/curriculum";
import type { Dictionary } from "@/types/i18n";
import {
  RUBRIC_SCALE_LEVELS,
  RUBRIC_TASK_TYPES,
  RUBRIC_TYPES,
  type RubricFormErrors,
  type RubricFormInput,
  type RubricGenerationStatus,
  type RubricScale,
  type RubricTaskType,
  type RubricType,
} from "@/types/rubric";

const TASK_ICONS: Record<RubricTaskType, LucideIcon> = {
  proje: FolderKanban,
  sunum: Presentation,
  deney: FlaskConical,
  grup: Users,
  portfolyo: FolderOpen,
};

const TYPE_ICONS: Record<RubricType, LucideIcon> = {
  analitik: Layers,
  butuncul: ClipboardCheck,
  akranOz: UsersRound,
};

interface RubricFormProps {
  t: Dictionary;
  form: RubricFormInput;
  errors: RubricFormErrors;
  status: RubricGenerationStatus;
  onFieldChange: <K extends keyof RubricFormInput>(key: K, value: RubricFormInput[K]) => void;
  onSelectTopic: (selection: { gradeId: string; unitId: string; topicId: string; topicName: string; outcomeCodes: string[] }) => void;
  onFreeTopic: (topic: string) => void;
  onToggleOutcome: (outcome: CurriculumOutcome) => void;
  onSetOutcomes: (outcomes: CurriculumOutcome[]) => void;
  onSubmit: () => void;
}

export function RubricForm({
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
}: RubricFormProps) {
  const copy = t.rubricGenerator.form;
  const curriculumCopy = t.curriculum;
  const isLoading = status === "loading";

  // Ders + sınıf havuzla eşleşirse konu müfredat listesine dönüşür (Ders Planlayıcı ile aynı veri).
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
          <LessonPlanField id="rb-subject" label={copy.fields.subject.label} required error={errors.subject}>
            <Input
              id="rb-subject"
              value={form.subject}
              list="rb-subject-options"
              autoComplete="off"
              placeholder={copy.fields.subject.placeholder}
              aria-invalid={Boolean(errors.subject)}
              aria-describedby={errors.subject ? "rb-subject-error" : undefined}
              onChange={(event) => onFieldChange("subject", event.target.value)}
            />
            <datalist id="rb-subject-options">
              {CURRICULUM_SUBJECTS.map((subject) => (
                <option key={subject} value={subject} />
              ))}
            </datalist>
          </LessonPlanField>
          <LessonPlanField id="rb-grade" label={copy.fields.gradeLevel.label} required error={errors.gradeLevel}>
            <Input
              id="rb-grade"
              value={form.gradeLevel}
              list="rb-grade-options"
              autoComplete="off"
              placeholder={copy.fields.gradeLevel.placeholder}
              aria-invalid={Boolean(errors.gradeLevel)}
              aria-describedby={errors.gradeLevel ? "rb-grade-error" : undefined}
              onChange={(event) => onFieldChange("gradeLevel", event.target.value)}
            />
            <datalist id="rb-grade-options">
              {curriculumGradeOptions(form.subject).map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </LessonPlanField>
        </div>

        <LessonPlanField id="rb-topic" label={copy.fields.topic.label} required error={errors.topic} hint={topicHint}>
          {gradeData ? (
            <CurriculumTopicCombobox
              t={t}
              id="rb-topic"
              grade={gradeData}
              value={form.topic}
              selectedTopicId={topic?.id}
              invalid={Boolean(errors.topic)}
              describedBy={errors.topic ? "rb-topic-error" : undefined}
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
              id="rb-topic"
              value={form.topic}
              placeholder={copy.fields.topic.placeholder}
              aria-invalid={Boolean(errors.topic)}
              aria-describedby={errors.topic ? "rb-topic-error" : undefined}
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
            description={copy.skillsDescription}
            autoIncludedTitle={copy.skillsAutoTitle}
          />
        ) : (
          <p className="flex items-start gap-1.5 rounded-lg bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            <Landmark className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
            {copy.noCurriculumSkillsHint}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ClipboardCheck className="size-3.5" aria-hidden="true" />
          </span>
          <h2 className="text-[0.95rem] font-semibold tracking-tight text-foreground">{copy.taskTitle}</h2>
        </div>

        <RubricChoiceGroup<RubricTaskType>
          label={copy.taskTypeLabel}
          value={form.taskType}
          onChange={(value) => onFieldChange("taskType", value)}
          options={RUBRIC_TASK_TYPES.map((value) => ({ value, icon: TASK_ICONS[value], ...copy.taskTypes[value] }))}
        />

        <RubricChoiceGroup<RubricType>
          label={copy.rubricTypeLabel}
          value={form.rubricType}
          onChange={(value) => onFieldChange("rubricType", value)}
          columns="grid-cols-1 sm:grid-cols-3"
          options={RUBRIC_TYPES.map((value) => ({ value, icon: TYPE_ICONS[value], ...copy.rubricTypes[value] }))}
        />

        <RubricChoiceGroup<"3" | "4">
          label={copy.scaleLabel}
          value={String(form.scale) as "3" | "4"}
          onChange={(value) => onFieldChange("scale", Number(value) as RubricScale)}
          options={(["3", "4"] as const).map((value) => ({
            value,
            label: copy.scales[value],
            preview: (
              <span className="mt-1 flex flex-wrap gap-1">
                {RUBRIC_SCALE_LEVELS[Number(value) as RubricScale].map((level) => (
                  <span key={level.id} className="rounded bg-muted px-1.5 py-px text-[0.65rem] text-muted-foreground">
                    {t.rubricGenerator.levels[level.id]}
                  </span>
                ))}
              </span>
            ),
          }))}
        />

        <LessonPlanField id="rb-task" label={copy.fields.taskDescription.label}>
          <Textarea
            id="rb-task"
            rows={2}
            value={form.taskDescription}
            placeholder={copy.fields.taskDescription.placeholder}
            onChange={(event) => onFieldChange("taskDescription", event.target.value)}
          />
        </LessonPlanField>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <Button
          type="submit"
          size="lg"
          disabled={isLoading}
          className="h-12 w-full gap-1.5 rounded-xl text-[0.95rem] shadow-md shadow-primary/15 transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.99] disabled:opacity-100"
        >
          {isLoading ? copy.submitLoading : copy.submit}
          {isLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{copy.submitCaption}</p>
      </div>
    </form>
  );
}
