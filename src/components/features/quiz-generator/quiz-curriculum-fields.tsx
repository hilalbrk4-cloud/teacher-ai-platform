"use client";

import * as React from "react";
import { ListTree, PencilLine } from "lucide-react";

import { CurriculumOutcomePicker } from "@/components/features/curriculum/curriculum-outcome-picker";
import { LessonPlanField } from "@/components/features/lesson-planner/lesson-plan-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCurriculumGrade } from "@/hooks/use-curriculum-grade";
import {
  appendOutcomeLines,
  CURRICULUM_SUBJECTS,
  curriculumGradeOptions,
  findCurriculumEntry,
  matchSubjectId,
  removeOutcomeLines,
} from "@/lib/curriculum/catalog";
import type { CurriculumOutcome, LessonPlanCurriculumSelection } from "@/types/curriculum";
import type { Dictionary } from "@/types/i18n";
import type { QuizFormErrors, QuizFormInput } from "@/types/quiz-generator";

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30";

/** Konu seçilince kazanımlar bu sayıya kadar otomatik işaretlenir; daha fazlasında öğretmen seçer. */
const AUTO_SELECT_LIMIT = 3;

interface QuizCurriculumFieldsProps {
  t: Dictionary;
  form: QuizFormInput;
  errors: QuizFormErrors;
  onFieldChange: <K extends keyof QuizFormInput>(key: K, value: QuizFormInput[K]) => void;
}

/**
 * Quiz formunun Ders / Sınıf düzeyi / Konu / Kazanımlar bölümü. Ders, MEB
 * yıllık plan havuzundaki (`src/data/curriculum`, Rubrik ve Ders Planlayıcı
 * ile aynı kaynak) bir dersle eşleşirse sınıf ve konu açılır menüden seçilir;
 * seçilen kazanımlar "KOD — metin" satırları olarak hedefler alanına yazılır.
 *
 * Yalnızca formun mevcut alanlarını (`gradeLevel`, `topic`, `objectives`)
 * doldurur: quiz isteği ve üretim mantığı değişmez.
 */
export function QuizCurriculumFields({ t, form, errors, onFieldChange }: QuizCurriculumFieldsProps) {
  const copy = t.quizGenerator.form;
  const planCopy = copy.plan;
  const [selection, setSelection] = React.useState<LessonPlanCurriculumSelection | null>(null);
  const [manualTopic, setManualTopic] = React.useState(false);

  const subjectInPool = Boolean(matchSubjectId(form.subject));
  const gradeOptions = subjectInPool ? curriculumGradeOptions(form.subject) : [];
  const entry = findCurriculumEntry(form.subject, form.gradeLevel);
  const grade = useCurriculumGrade(entry?.id);
  const gradeData = grade.status === "ready" ? grade.data : undefined;
  const activeSelection = selection && gradeData?.id === selection.gradeId ? selection : null;
  const unit = activeSelection ? gradeData?.units.find((item) => item.id === activeSelection.unitId) : undefined;
  const topic = activeSelection ? unit?.topics.find((item) => item.id === activeSelection.topicId) : undefined;
  const usePlanTopic = Boolean(gradeData) && !manualTopic;

  /** Seçimi bırakır ve plandan eklenen kazanım satırlarını hedeflerden temizler. */
  function clearSelection(options: { clearTopic: boolean }) {
    if (selection) {
      onFieldChange("objectives", removeOutcomeLines(form.objectives, selection.outcomeCodes));
      if (options.clearTopic) onFieldChange("topic", "");
    }
    setSelection(null);
  }

  function handleSubjectChange(value: string) {
    if (selection && findCurriculumEntry(value, form.gradeLevel)?.id !== selection.gradeId) clearSelection({ clearTopic: true });
    onFieldChange("subject", value);
  }

  function handleGradeChange(value: string) {
    if (selection) clearSelection({ clearTopic: true });
    onFieldChange("gradeLevel", value);
  }

  function handleTopicSelect(topicId: string) {
    if (!gradeData) return;
    const nextUnit = gradeData.units.find((item) => item.topics.some((candidate) => candidate.id === topicId));
    const nextTopic = nextUnit?.topics.find((candidate) => candidate.id === topicId);
    const base = selection ? removeOutcomeLines(form.objectives, selection.outcomeCodes) : form.objectives;
    if (!nextUnit || !nextTopic) {
      setSelection(null);
      onFieldChange("objectives", base);
      onFieldChange("topic", "");
      return;
    }
    // Az kazanımlı konularda (çoğu Matematik/Fen konusu) hepsi işaretlenir; Türkçe gibi uzun listelerde öğretmen seçer.
    const preselected = nextTopic.outcomeCodes.length <= AUTO_SELECT_LIMIT ? nextTopic.outcomeCodes : [];
    setSelection({ gradeId: gradeData.id, unitId: nextUnit.id, topicId: nextTopic.id, outcomeCodes: preselected });
    onFieldChange("topic", nextTopic.name);
    onFieldChange("objectives", appendOutcomeLines(base, preselected.map((code) => gradeData.outcomes[code])));
  }

  function toggleOutcome(outcome: CurriculumOutcome) {
    if (!activeSelection) return;
    const selected = activeSelection.outcomeCodes.includes(outcome.code);
    const outcomeCodes = selected
      ? activeSelection.outcomeCodes.filter((code) => code !== outcome.code)
      : [...activeSelection.outcomeCodes, outcome.code];
    setSelection({ ...activeSelection, outcomeCodes });
    onFieldChange("objectives", selected ? removeOutcomeLines(form.objectives, [outcome.code]) : appendOutcomeLines(form.objectives, [outcome]));
  }

  function setAllOutcomes(outcomes: CurriculumOutcome[]) {
    if (!activeSelection) return;
    const base = removeOutcomeLines(form.objectives, activeSelection.outcomeCodes);
    setSelection({ ...activeSelection, outcomeCodes: outcomes.map((outcome) => outcome.code) });
    onFieldChange("objectives", appendOutcomeLines(base, outcomes));
  }

  function switchToManual() {
    clearSelection({ clearTopic: false });
    setManualTopic(true);
  }

  const topicHint =
    grade.status === "loading"
      ? t.curriculum.topicLoading
      : grade.status === "error"
        ? t.curriculum.topicLoadError
        : form.subject.trim() && !subjectInPool
          ? planCopy.noPlanHint
          : gradeData
            ? planCopy.planSource(gradeData.subject, gradeData.grade)
            : undefined;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <LessonPlanField id="qz-subject" label={copy.fields.subject.label} required error={errors.subject}>
          <Input
            id="qz-subject"
            value={form.subject}
            list="qz-subject-options"
            autoComplete="off"
            onChange={(event) => handleSubjectChange(event.target.value)}
            placeholder={copy.fields.subject.placeholder}
            aria-invalid={Boolean(errors.subject)}
            aria-describedby={errors.subject ? "qz-subject-error" : undefined}
          />
          <datalist id="qz-subject-options">
            {CURRICULUM_SUBJECTS.map((subject) => (
              <option key={subject} value={subject} />
            ))}
          </datalist>
        </LessonPlanField>

        <LessonPlanField id="qz-grade" label={copy.fields.gradeLevel.label} required error={errors.gradeLevel}>
          {subjectInPool ? (
            <select
              id="qz-grade"
              value={entry ? `${entry.grade}. Sınıf` : ""}
              onChange={(event) => handleGradeChange(event.target.value)}
              aria-invalid={Boolean(errors.gradeLevel)}
              aria-describedby={errors.gradeLevel ? "qz-grade-error" : undefined}
              className={selectClassName}
            >
              <option value="" disabled>
                {planCopy.gradePlaceholder}
              </option>
              {gradeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id="qz-grade"
              value={form.gradeLevel}
              onChange={(event) => onFieldChange("gradeLevel", event.target.value)}
              placeholder={copy.fields.gradeLevel.placeholder}
              aria-invalid={Boolean(errors.gradeLevel)}
              aria-describedby={errors.gradeLevel ? "qz-grade-error" : undefined}
            />
          )}
        </LessonPlanField>
      </div>

      <LessonPlanField id="qz-topic" label={copy.fields.topic.label} required error={errors.topic} hint={topicHint}>
        {usePlanTopic && gradeData ? (
          <select
            id="qz-topic"
            value={activeSelection?.topicId ?? ""}
            onChange={(event) => handleTopicSelect(event.target.value)}
            aria-invalid={Boolean(errors.topic)}
            aria-describedby={errors.topic ? "qz-topic-error" : undefined}
            className={selectClassName}
          >
            <option value="" disabled>
              {planCopy.topicPlaceholder}
            </option>
            {gradeData.units.map((item) => (
              <optgroup key={item.id} label={item.name}>
                {item.topics.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name} · {planCopy.topicOutcomeCount(candidate.outcomeCodes.length)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        ) : (
          <Input
            id="qz-topic"
            value={form.topic}
            onChange={(event) => onFieldChange("topic", event.target.value)}
            placeholder={copy.fields.topic.placeholder}
            aria-invalid={Boolean(errors.topic)}
            aria-describedby={errors.topic ? "qz-topic-error" : undefined}
          />
        )}
      </LessonPlanField>
      {gradeData ? (
        <button
          type="button"
          onClick={() => (usePlanTopic ? switchToManual() : setManualTopic(false))}
          className="-mt-2 flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none"
        >
          {usePlanTopic ? <PencilLine className="size-3" aria-hidden="true" /> : <ListTree className="size-3" aria-hidden="true" />}
          {usePlanTopic ? planCopy.manualTopic : planCopy.planTopic}
        </button>
      ) : null}

      {gradeData && unit && topic && activeSelection ? (
        <CurriculumOutcomePicker
          t={t}
          grade={gradeData}
          unit={unit}
          topic={topic}
          selectedCodes={activeSelection.outcomeCodes}
          onToggle={toggleOutcome}
          onSetAll={setAllOutcomes}
          description={planCopy.outcomesDescription}
          hideIncluded
        />
      ) : null}

      <LessonPlanField
        id="qz-objectives"
        label={copy.fields.objectives.label}
        required
        error={errors.objectives}
        hint={activeSelection && activeSelection.outcomeCodes.length > 0 ? planCopy.objectivesHint : undefined}
      >
        <Textarea
          id="qz-objectives"
          value={form.objectives}
          onChange={(event) => onFieldChange("objectives", event.target.value)}
          placeholder={copy.fields.objectives.placeholder}
          rows={activeSelection && activeSelection.outcomeCodes.length > 0 ? 5 : 3}
          aria-invalid={Boolean(errors.objectives)}
          aria-describedby={errors.objectives ? "qz-objectives-error" : undefined}
        />
      </LessonPlanField>
    </>
  );
}
