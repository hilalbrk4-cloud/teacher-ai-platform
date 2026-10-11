"use client";

import * as React from "react";

import { findCurriculumEntry, outcomeObjectiveLine } from "@/lib/curriculum/catalog";
import { generateLessonPlanViaApi, LessonPlanApiError } from "@/lib/lesson-planner/lesson-plan-api-client";
import { shortenLessonPlan, expandLessonPlan } from "@/lib/lesson-planner/content-transforms";
import { lessonPlanDocumentStore } from "@/lib/lesson-planner/document-store";
import { downloadLessonPlanDocx } from "@/lib/lesson-planner/export-docx";
import { createLessonPlannerId } from "@/lib/lesson-planner/id";
import { TYMM_SKILL_GROUP_ORDER } from "@/lib/lesson-planner/tymm-skills";
import type {
  LessonPlan,
  LessonPlanDocument,
  LessonPlanFeedback,
  LessonPlanFormErrors,
  LessonPlanFormInput,
  LessonPlanGenerationStatus,
  LessonPlanRefinementId,
  LessonPlanRequiredField,
  LessonPlanSectionKey,
} from "@/types/lesson-planner";
import type { Dictionary } from "@/types/i18n";

const INITIAL_FORM: LessonPlanFormInput = {
  subject: "",
  gradeLevel: "",
  topic: "",
  duration: 40,
  objectives: "",
  teachingApproach: "",
  studentLevel: "",
  materials: "",
  assessmentPreference: "",
  specialNeeds: "",
  additionalNotes: "",
  refinements: [],
  curriculum: null,
};

const REQUIRED_FIELDS: LessonPlanRequiredField[] = [
  "subject",
  "gradeLevel",
  "topic",
  "duration",
  "objectives",
];

const FEEDBACK_DURATION_MS = 3200;

// The API route may be backed by the mock service or a real (slower) AI
// call, and a single fetch/response cycle has no built-in progress signal.
// These timers advance the staged loading messages on a fixed client-side
// cadence while the request is in flight, so the loading experience stays
// the same regardless of which provider actually answers it.
const LOADING_STAGE_INTERVAL_MS = 700;

// Slightly above the server's worst case — LESSON_PLAN_REQUEST_TIMEOUT_MS ×
// LESSON_PLAN_MAX_ATTEMPTS in src/lib/ai/config.ts (60s × 2) — so the server
// times out first and returns a proper error instead of the client
// aborting a request that was about to succeed.
const CLIENT_REQUEST_TIMEOUT_MS = 125_000;

/** Hedefler metninden belirtilen resmî kodlarla başlayan satırları kaldırır; öğretmenin kendi satırları korunur. */
function removeOutcomeLines(objectives: string, codes: readonly string[]): string {
  return objectives
    .split("\n")
    .filter((line) => !codes.some((code) => line.trimStart().startsWith(`${code} — `)))
    .join("\n")
    .trim();
}

function isRequiredField(key: keyof LessonPlanFormInput): key is LessonPlanRequiredField {
  return (REQUIRED_FIELDS as string[]).includes(key);
}

function validateForm(form: LessonPlanFormInput, t: Dictionary): LessonPlanFormErrors {
  const errors: LessonPlanFormErrors = {};
  const messages = t.lessonPlanner.form.errors;

  if (!form.subject.trim()) errors.subject = messages.subject;
  if (!form.gradeLevel.trim()) errors.gradeLevel = messages.gradeLevel;
  if (!form.topic.trim()) errors.topic = messages.topic;
  if (!form.duration || form.duration <= 0) errors.duration = messages.duration;
  if (!form.objectives.trim()) errors.objectives = messages.objectives;

  return errors;
}

function buildDocumentDraft(plan: LessonPlan): LessonPlanDocument {
  const now = new Date().toISOString();
  return {
    id: createLessonPlannerId("lp"),
    title: `${plan.topic} Ders Planı`,
    status: "draft",
    plan,
    createdAt: now,
    updatedAt: now,
  };
}

export function useLessonPlanGenerator(t: Dictionary) {
  const [form, setForm] = React.useState<LessonPlanFormInput>(INITIAL_FORM);
  const [errors, setErrors] = React.useState<LessonPlanFormErrors>({});
  const [status, setStatus] = React.useState<LessonPlanGenerationStatus>("idle");
  const [loadingStage, setLoadingStage] = React.useState(0);
  const [plan, setPlan] = React.useState<LessonPlan | null>(null);
  const [savedDocument, setSavedDocument] = React.useState<LessonPlanDocument | null>(null);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [isExportingWord, setIsExportingWord] = React.useState(false);
  const [feedback, setFeedback] = React.useState<LessonPlanFeedback | null>(null);

  const feedbackTimeoutRef = React.useRef<number | undefined>(undefined);

  const showFeedback = React.useCallback((next: LessonPlanFeedback) => {
    setFeedback(next);
    if (feedbackTimeoutRef.current) window.clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = window.setTimeout(() => setFeedback(null), FEEDBACK_DURATION_MS);
  }, []);

  React.useEffect(
    () => () => {
      if (feedbackTimeoutRef.current) window.clearTimeout(feedbackTimeoutRef.current);
    },
    []
  );

  const updateField = React.useCallback(
    <K extends keyof LessonPlanFormInput>(key: K, value: LessonPlanFormInput[K]) => {
      setForm((prev) => {
        const next = { ...prev, [key]: value };
        // Ders veya sınıf değişip seçili müfredatla artık eşleşmiyorsa seçim ve eklediği resmî satırlar kaldırılır.
        if ((key === "subject" || key === "gradeLevel") && prev.curriculum) {
          const entry = findCurriculumEntry(next.subject, next.gradeLevel);
          if (entry?.id !== prev.curriculum.gradeId) {
            return { ...next, curriculum: null, objectives: removeOutcomeLines(next.objectives, prev.curriculum.outcomeCodes) };
          }
        }
        return next;
      });
      setErrors((prev) => {
        if (!isRequiredField(key) || !prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    []
  );

  /** Müfredat listesinden konu seçimi: konu adı forma yazılır, önceki konunun resmî satırları kaldırılır. */
  const selectCurriculumTopic = React.useCallback(
    (selection: { gradeId: string; unitId: string; topicId: string; topicName: string }) => {
      setForm((prev) => ({
        ...prev,
        topic: selection.topicName,
        objectives: prev.curriculum ? removeOutcomeLines(prev.objectives, prev.curriculum.outcomeCodes) : prev.objectives,
        curriculum: { gradeId: selection.gradeId, unitId: selection.unitId, topicId: selection.topicId, outcomeCodes: [] },
      }));
      setErrors((prev) => {
        if (!prev.topic) return prev;
        const next = { ...prev };
        delete next.topic;
        return next;
      });
    },
    []
  );

  /** Konu alanına serbest yazım: müfredat seçimi bırakılır, öğretmenin kendi metni korunur. */
  const setFreeTopic = React.useCallback((topic: string) => {
    setForm((prev) => ({
      ...prev,
      topic,
      objectives: prev.curriculum ? removeOutcomeLines(prev.objectives, prev.curriculum.outcomeCodes) : prev.objectives,
      curriculum: null,
    }));
  }, []);

  /** Resmî çıktı seçimi: kod seçime, "KOD — metin" satırı hedefler alanına eklenir/çıkarılır. */
  const toggleCurriculumOutcome = React.useCallback((outcome: { code: string; text: string }) => {
    setForm((prev) => {
      if (!prev.curriculum) return prev;
      const selected = prev.curriculum.outcomeCodes.includes(outcome.code);
      const outcomeCodes = selected
        ? prev.curriculum.outcomeCodes.filter((code) => code !== outcome.code)
        : [...prev.curriculum.outcomeCodes, outcome.code];
      const objectives = selected
        ? removeOutcomeLines(prev.objectives, [outcome.code])
        : [prev.objectives.trim(), outcomeObjectiveLine(outcome)].filter(Boolean).join("\n");
      return { ...prev, objectives, curriculum: { ...prev.curriculum, outcomeCodes } };
    });
    setErrors((prev) => {
      if (!prev.objectives) return prev;
      const next = { ...prev };
      delete next.objectives;
      return next;
    });
  }, []);

  /** Bir konunun çıktılarını topluca seçer ya da hepsini bırakır. */
  const setCurriculumOutcomes = React.useCallback((outcomes: { code: string; text: string }[]) => {
    setForm((prev) => {
      if (!prev.curriculum) return prev;
      const base = removeOutcomeLines(prev.objectives, prev.curriculum.outcomeCodes);
      const objectives = [base.trim(), ...outcomes.map(outcomeObjectiveLine)].filter(Boolean).join("\n");
      return { ...prev, objectives, curriculum: { ...prev.curriculum, outcomeCodes: outcomes.map((outcome) => outcome.code) } };
    });
  }, []);

  const toggleRefinement = React.useCallback((id: LessonPlanRefinementId) => {
    setForm((prev) => ({
      ...prev,
      refinements: prev.refinements.includes(id)
        ? prev.refinements.filter((item) => item !== id)
        : [...prev.refinements, id],
    }));
  }, []);

  const generate = React.useCallback(async () => {
    const validationErrors = validateForm(form, t);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setStatus("error");
      showFeedback({ type: "error", message: t.lessonPlanner.feedback.validation });
      return;
    }

    setErrors({});
    setStatus("loading");
    setLoadingStage(0);
    setIsEditMode(false);

    const stageTimers = [
      window.setTimeout(() => setLoadingStage(1), LOADING_STAGE_INTERVAL_MS),
      window.setTimeout(() => setLoadingStage(2), LOADING_STAGE_INTERVAL_MS * 2),
    ];
    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => abortController.abort(), CLIENT_REQUEST_TIMEOUT_MS);

    try {
      // The client never builds a prompt and never knows whether the
      // server will use the mock service or OpenAI — that choice is made
      // entirely server-side (LESSON_PLAN_PROVIDER is a server-only env
      // var). This is the only network call the Lesson Planner makes.
      const generated = await generateLessonPlanViaApi(form, { signal: abortController.signal });
      setPlan(generated);
      setStatus("success");
      showFeedback({ type: "success", message: t.lessonPlanner.feedback.generated });
    } catch (error) {
      setStatus("error");
      if (error instanceof DOMException && error.name === "AbortError") {
        showFeedback({ type: "error", message: t.lessonPlanner.feedback.requestTimeout });
      } else if (error instanceof LessonPlanApiError && error.message) {
        showFeedback({ type: "error", message: error.message });
      } else {
        showFeedback({ type: "error", message: t.lessonPlanner.feedback.generationError });
      }
    } finally {
      window.clearTimeout(timeoutId);
      stageTimers.forEach((id) => window.clearTimeout(id));
    }
  }, [form, t, showFeedback]);

  const updateSectionContent = React.useCallback((key: LessonPlanSectionKey, content: string) => {
    setPlan((prev) =>
      prev
        ? { ...prev, sections: prev.sections.map((section) => (section.key === key ? { ...section, content } : section)) }
        : prev
    );
  }, []);

  const toggleEditMode = React.useCallback(() => setIsEditMode((prev) => !prev), []);

  const copySectionContent = React.useCallback(
    async (key: LessonPlanSectionKey) => {
      const section = plan?.sections.find((item) => item.key === key);
      if (!section) return;
      try {
        await navigator.clipboard.writeText(section.content);
        showFeedback({ type: "success", message: t.lessonPlanner.feedback.copiedSection });
      } catch {
        showFeedback({ type: "error", message: t.lessonPlanner.feedback.copyError });
      }
    },
    [plan, t, showFeedback]
  );

  const copyPlan = React.useCallback(async () => {
    if (!plan) return;
    const { preview, skills: skillsCopy } = t.lessonPlanner;
    const sectionTexts = plan.sections.map((section) => {
      const range = section.timeRange ? ` (${preview.timeRange(section.timeRange.start, section.timeRange.end)})` : "";
      return `${t.lessonPlanner.sections[section.key]}${range}\n${section.content}`;
    });
    if (plan.skills) {
      const skills = plan.skills;
      const skillLines = TYMM_SKILL_GROUP_ORDER.filter((group) => skills[group].length > 0).map(
        (group) => `${skillsCopy.groups[group].short} — ${skillsCopy.groups[group].label}: ${skills[group].join(", ")}`
      );
      sectionTexts.push(`${skillsCopy.title}\n${skillLines.join("\n")}`);
    }
    const text = sectionTexts.join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      showFeedback({ type: "success", message: t.lessonPlanner.feedback.copiedAll });
    } catch {
      showFeedback({ type: "error", message: t.lessonPlanner.feedback.copyError });
    }
  }, [plan, t, showFeedback]);

  const shorten = React.useCallback(() => {
    if (!plan) return;
    setPlan(shortenLessonPlan(plan));
    showFeedback({ type: "success", message: t.lessonPlanner.feedback.shortened });
  }, [plan, t, showFeedback]);

  const expand = React.useCallback(() => {
    if (!plan) return;
    setPlan(expandLessonPlan(plan));
    showFeedback({ type: "success", message: t.lessonPlanner.feedback.expanded });
  }, [plan, t, showFeedback]);

  const save = React.useCallback(() => {
    if (!plan) return;
    const draft = savedDocument ?? buildDocumentDraft(plan);
    const result = lessonPlanDocumentStore.save({ ...draft, plan });
    setSavedDocument(result);
    showFeedback({ type: "success", message: t.lessonPlanner.feedback.saved });
  }, [plan, savedDocument, t, showFeedback]);

  const duplicate = React.useCallback(() => {
    if (!plan) return;
    const source = savedDocument ?? buildDocumentDraft(plan);
    lessonPlanDocumentStore.duplicate({ ...source, plan });
    showFeedback({ type: "success", message: t.lessonPlanner.feedback.duplicated });
  }, [plan, savedDocument, t, showFeedback]);

  const exportWord = React.useCallback(async () => {
    if (!plan || isExportingWord) return;
    setIsExportingWord(true);
    try {
      const fileName = await downloadLessonPlanDocx(plan);
      showFeedback({ type: "success", message: t.lessonPlanner.feedback.exportedWord(fileName) });
    } catch (error) {
      console.error("[EduPilot] Word export failed:", error);
      showFeedback({ type: "error", message: t.lessonPlanner.feedback.exportWordError });
    } finally {
      setIsExportingWord(false);
    }
  }, [plan, isExportingWord, t, showFeedback]);

  return {
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
    selectCurriculumTopic,
    setFreeTopic,
    toggleCurriculumOutcome,
    setCurriculumOutcomes,
    generate,
    regenerate: generate,
    updateSectionContent,
    toggleEditMode,
    copySectionContent,
    copyPlan,
    shorten,
    expand,
    save,
    duplicate,
    exportWord,
    isExportingWord,
  };
}
