"use client";

import * as React from "react";

import { findCurriculumEntry } from "@/lib/curriculum/catalog";
import { downloadRubricDocx } from "@/lib/rubric/export-rubric";
import { generateRubricViaApi, RubricApiError } from "@/lib/rubric/rubric-api-client";
import type { CurriculumOutcome } from "@/types/curriculum";
import type { Dictionary } from "@/types/i18n";
import type {
  Rubric,
  RubricFeedback,
  RubricFormErrors,
  RubricFormInput,
  RubricGenerationStatus,
  RubricRequiredField,
} from "@/types/rubric";

const INITIAL_FORM: RubricFormInput = {
  subject: "",
  gradeLevel: "",
  topic: "",
  taskType: "proje",
  rubricType: "analitik",
  scale: 4,
  taskDescription: "",
  curriculum: null,
};

const REQUIRED_FIELDS: RubricRequiredField[] = ["subject", "gradeLevel", "topic"];
const FEEDBACK_DURATION_MS = 3200;
const LOADING_STAGE_INTERVAL_MS = 1400;
/** Sunucunun en kötü durumu (60 sn × 2 deneme) biraz aşılır; önce sunucu anlamlı hata döndürür. */
const CLIENT_REQUEST_TIMEOUT_MS = 125_000;

export type RubricExportKind = "rubrik" | "ogrenci";

export function useRubricGenerator(t: Dictionary) {
  const copy = t.rubricGenerator;
  const [form, setForm] = React.useState<RubricFormInput>(INITIAL_FORM);
  const [errors, setErrors] = React.useState<RubricFormErrors>({});
  const [status, setStatus] = React.useState<RubricGenerationStatus>("idle");
  const [loadingStage, setLoadingStage] = React.useState(0);
  const [rubric, setRubric] = React.useState<Rubric | null>(null);
  const [exporting, setExporting] = React.useState<RubricExportKind | null>(null);
  const [feedback, setFeedback] = React.useState<RubricFeedback | null>(null);
  const feedbackTimeout = React.useRef<number | undefined>(undefined);

  const showFeedback = React.useCallback((next: RubricFeedback) => {
    setFeedback(next);
    window.clearTimeout(feedbackTimeout.current);
    feedbackTimeout.current = window.setTimeout(() => setFeedback(null), FEEDBACK_DURATION_MS);
  }, []);
  React.useEffect(() => () => window.clearTimeout(feedbackTimeout.current), []);

  const clearError = React.useCallback((key: string) => {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key as RubricRequiredField];
      return next;
    });
  }, []);

  const updateField = React.useCallback(
    <K extends keyof RubricFormInput>(key: K, value: RubricFormInput[K]) => {
      setForm((prev) => {
        const next = { ...prev, [key]: value };
        // Ders/sınıf değişip seçili müfredatla eşleşmezse seçim bırakılır.
        if ((key === "subject" || key === "gradeLevel") && prev.curriculum) {
          if (findCurriculumEntry(next.subject, next.gradeLevel)?.id !== prev.curriculum.gradeId) next.curriculum = null;
        }
        return next;
      });
      clearError(key);
    },
    [clearError]
  );

  const selectCurriculumTopic = React.useCallback(
    (selection: { gradeId: string; unitId: string; topicId: string; topicName: string; outcomeCodes: string[] }) => {
      setForm((prev) => ({
        ...prev,
        topic: selection.topicName,
        // Rubrikte konunun tüm çıktıları varsayılan olarak seçilir; öğretmen daraltabilir.
        curriculum: { gradeId: selection.gradeId, unitId: selection.unitId, topicId: selection.topicId, outcomeCodes: selection.outcomeCodes },
      }));
      clearError("topic");
    },
    [clearError]
  );

  const setFreeTopic = React.useCallback((topic: string) => {
    setForm((prev) => ({ ...prev, topic, curriculum: null }));
  }, []);

  const toggleOutcome = React.useCallback((outcome: CurriculumOutcome) => {
    setForm((prev) => {
      if (!prev.curriculum) return prev;
      const codes = prev.curriculum.outcomeCodes;
      const outcomeCodes = codes.includes(outcome.code) ? codes.filter((code) => code !== outcome.code) : [...codes, outcome.code];
      return { ...prev, curriculum: { ...prev.curriculum, outcomeCodes } };
    });
  }, []);

  const setOutcomes = React.useCallback((outcomes: CurriculumOutcome[]) => {
    setForm((prev) =>
      prev.curriculum ? { ...prev, curriculum: { ...prev.curriculum, outcomeCodes: outcomes.map((outcome) => outcome.code) } } : prev
    );
  }, []);

  const generate = React.useCallback(async () => {
    const validation: RubricFormErrors = {};
    for (const field of REQUIRED_FIELDS) if (!form[field].trim()) validation[field] = copy.form.errors[field];
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      showFeedback({ type: "error", message: copy.feedback.validation });
      return;
    }

    setStatus("loading");
    setLoadingStage(0);
    const timers = [1, 2].map((stage) => window.setTimeout(() => setLoadingStage(stage), LOADING_STAGE_INTERVAL_MS * stage));
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), CLIENT_REQUEST_TIMEOUT_MS);
    try {
      const generated = await generateRubricViaApi(form, { signal: controller.signal }, copy.feedback.generationError);
      setRubric(generated);
      setStatus("success");
      showFeedback({ type: "success", message: copy.feedback.generated });
    } catch (error) {
      setStatus("error");
      if (error instanceof DOMException && error.name === "AbortError") {
        showFeedback({ type: "error", message: copy.feedback.requestTimeout });
      } else {
        showFeedback({ type: "error", message: error instanceof RubricApiError ? error.message : copy.feedback.generationError });
      }
    } finally {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(timeout);
    }
  }, [form, copy, showFeedback]);

  const exportDocx = React.useCallback(
    async (kind: RubricExportKind) => {
      if (!rubric || exporting) return;
      setExporting(kind);
      try {
        const fileName = await downloadRubricDocx(rubric, kind);
        showFeedback({ type: "success", message: copy.feedback.exported(fileName) });
      } catch (error) {
        console.error("[EduPilot] Rubric export failed:", error);
        showFeedback({ type: "error", message: copy.feedback.exportError });
      } finally {
        setExporting(null);
      }
    },
    [rubric, exporting, copy, showFeedback]
  );

  return {
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
  };
}
