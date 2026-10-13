"use client";

import * as React from "react";

import { findCurriculumEntry } from "@/lib/curriculum/catalog";
import type { CurriculumOutcome } from "@/types/curriculum";
import type { Dictionary } from "@/types/i18n";
import type {
  Presentation,
  PresentationFormErrors,
  PresentationFormInput,
  PresentationGenerationStatus,
  PresentationRequiredField,
} from "@/types/presentation";

const INITIAL_FORM: PresentationFormInput = {
  subject: "",
  gradeLevel: "",
  topic: "",
  type: "yeniKonu",
  slideCount: 5,
  curriculum: null,
};
const REQUIRED: PresentationRequiredField[] = ["subject", "gradeLevel", "topic"];
const FEEDBACK_MS = 3500;
const STAGE_MS = 1600;
/** Sunucunun en kötü durumu (60 sn × 2 deneme) biraz aşılır. */
const CLIENT_TIMEOUT_MS = 125_000;

export interface PresentationFeedback {
  type: "success" | "error";
  message: string;
}

export function usePresentationGenerator(t: Dictionary) {
  const copy = t.presentationBuilder;
  const [form, setForm] = React.useState<PresentationFormInput>(INITIAL_FORM);
  const [errors, setErrors] = React.useState<PresentationFormErrors>({});
  const [status, setStatus] = React.useState<PresentationGenerationStatus>("idle");
  const [loadingStage, setLoadingStage] = React.useState(0);
  const [presentation, setPresentation] = React.useState<Presentation | null>(null);
  const [feedback, setFeedback] = React.useState<PresentationFeedback | null>(null);
  const feedbackTimer = React.useRef<number | undefined>(undefined);

  const showFeedback = React.useCallback((next: PresentationFeedback) => {
    setFeedback(next);
    window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), FEEDBACK_MS);
  }, []);
  React.useEffect(() => () => window.clearTimeout(feedbackTimer.current), []);

  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key as PresentationRequiredField];
      return next;
    });

  const updateField = React.useCallback(<K extends keyof PresentationFormInput>(key: K, value: PresentationFormInput[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if ((key === "subject" || key === "gradeLevel") && prev.curriculum && findCurriculumEntry(next.subject, next.gradeLevel)?.id !== prev.curriculum.gradeId) {
        next.curriculum = null;
      }
      return next;
    });
    clearError(key);
  }, []);

  const selectTopic = React.useCallback(
    (selection: { gradeId: string; unitId: string; topicId: string; topicName: string; outcomeCodes: string[] }) => {
      setForm((prev) => ({
        ...prev,
        topic: selection.topicName,
        curriculum: { gradeId: selection.gradeId, unitId: selection.unitId, topicId: selection.topicId, outcomeCodes: selection.outcomeCodes },
      }));
      clearError("topic");
    },
    []
  );

  const setFreeTopic = React.useCallback((topic: string) => setForm((prev) => ({ ...prev, topic, curriculum: null })), []);

  const toggleOutcome = React.useCallback((outcome: CurriculumOutcome) => {
    setForm((prev) => {
      if (!prev.curriculum) return prev;
      const codes = prev.curriculum.outcomeCodes;
      const outcomeCodes = codes.includes(outcome.code) ? codes.filter((code) => code !== outcome.code) : [...codes, outcome.code];
      return { ...prev, curriculum: { ...prev.curriculum, outcomeCodes } };
    });
  }, []);

  const setOutcomes = React.useCallback((outcomes: CurriculumOutcome[]) => {
    setForm((prev) => (prev.curriculum ? { ...prev, curriculum: { ...prev.curriculum, outcomeCodes: outcomes.map((item) => item.code) } } : prev));
  }, []);

  const generate = React.useCallback(async (): Promise<boolean> => {
    const validation: PresentationFormErrors = {};
    for (const field of REQUIRED) if (!form[field].trim()) validation[field] = copy.form.errors[field];
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      showFeedback({ type: "error", message: copy.feedback.validation });
      return false;
    }
    setStatus("loading");
    setLoadingStage(0);
    const timers = [1, 2].map((stage) => window.setTimeout(() => setLoadingStage(stage), STAGE_MS * stage));
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    try {
      const response = await fetch("/api/presentations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => null)) as { presentation?: Presentation; error?: { message?: string } } | null;
      if (!response.ok || !body?.presentation) throw new Error(body?.error?.message ?? copy.feedback.generationError);
      setPresentation(body.presentation);
      setStatus("success");
      showFeedback({ type: "success", message: copy.feedback.generated });
      return true;
    } catch (error) {
      setStatus("error");
      const aborted = error instanceof DOMException && error.name === "AbortError";
      showFeedback({ type: "error", message: aborted ? copy.feedback.requestTimeout : error instanceof Error ? error.message : copy.feedback.generationError });
      return false;
    } finally {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(timeout);
    }
  }, [form, copy, showFeedback]);

  return { form, errors, status, loadingStage, presentation, feedback, showFeedback, updateField, selectTopic, setFreeTopic, toggleOutcome, setOutcomes, generate };
}
