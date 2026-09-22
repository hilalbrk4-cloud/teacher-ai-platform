"use client";

import * as React from "react";

import { quizDocumentStore } from "@/lib/quiz-generator/document-store";
import { createQuizGeneratorId } from "@/lib/quiz-generator/id";
import { generateQuizViaApi, QuizApiError } from "@/lib/quiz-generator/quiz-api-client";
import type { Dictionary } from "@/types/i18n";
import type {
  QuestionType,
  Quiz,
  QuizDocument,
  QuizFeedback,
  QuizFormErrors,
  QuizFormInput,
  QuizGenerationStatus,
  QuizQuestion,
  QuizRequiredField,
  VisualType,
} from "@/types/quiz-generator";

const INITIAL_FORM: QuizFormInput = {
  quizType: "classroomQuiz",
  subject: "",
  gradeLevel: "",
  topic: "",
  objectives: "",
  questionCount: 10,
  questionTypes: ["multipleChoice"],
  questionApproach: "learningCheck",
  cognitiveLevel: "understand",
  difficulty: "medium",
  visualUsage: "none",
  visualTypes: [],
  includeAnswerKey: true,
  includeExplanations: false,
};

const REQUIRED_FIELDS: QuizRequiredField[] = ["subject", "gradeLevel", "topic", "objectives", "questionCount"];

const FEEDBACK_DURATION_MS = 3200;
const LOADING_STAGE_INTERVAL_MS = 700;
const CLIENT_REQUEST_TIMEOUT_MS = 35_000;

function isRequiredField(key: keyof QuizFormInput): key is QuizRequiredField {
  return (REQUIRED_FIELDS as string[]).includes(key);
}

function validateForm(form: QuizFormInput, t: Dictionary): QuizFormErrors {
  const errors: QuizFormErrors = {};
  const messages = t.quizGenerator.form.errors;

  if (!form.subject.trim()) errors.subject = messages.subject;
  if (!form.gradeLevel.trim()) errors.gradeLevel = messages.gradeLevel;
  if (!form.topic.trim()) errors.topic = messages.topic;
  if (!form.objectives.trim()) errors.objectives = messages.objectives;
  if (!form.questionCount || form.questionCount <= 0) errors.questionCount = messages.questionCount;

  return errors;
}

function buildDocumentDraft(quiz: Quiz): QuizDocument {
  const now = new Date().toISOString();
  return {
    id: createQuizGeneratorId("quiz-doc"),
    title: quiz.title,
    status: "draft",
    quiz,
    createdAt: now,
    updatedAt: now,
  };
}

export function useQuizGenerator(t: Dictionary) {
  const [form, setForm] = React.useState<QuizFormInput>(INITIAL_FORM);
  const [errors, setErrors] = React.useState<QuizFormErrors>({});
  const [status, setStatus] = React.useState<QuizGenerationStatus>("idle");
  const [loadingStage, setLoadingStage] = React.useState(0);
  const [quiz, setQuiz] = React.useState<Quiz | null>(null);
  const [savedDocument, setSavedDocument] = React.useState<QuizDocument | null>(null);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [showAnswerKey, setShowAnswerKey] = React.useState(false);
  const [feedback, setFeedback] = React.useState<QuizFeedback | null>(null);

  const feedbackTimeoutRef = React.useRef<number | undefined>(undefined);

  const showFeedback = React.useCallback((next: QuizFeedback) => {
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
    <K extends keyof QuizFormInput>(key: K, value: QuizFormInput[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        if (!isRequiredField(key) || !prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    []
  );

  const toggleQuestionType = React.useCallback((type: QuestionType) => {
    setForm((prev) => ({
      ...prev,
      questionTypes: prev.questionTypes.includes(type)
        ? prev.questionTypes.filter((item) => item !== type)
        : [...prev.questionTypes, type],
    }));
  }, []);

  const toggleVisualType = React.useCallback((type: VisualType) => {
    setForm((prev) => ({
      ...prev,
      visualTypes: prev.visualTypes.includes(type)
        ? prev.visualTypes.filter((item) => item !== type)
        : [...prev.visualTypes, type],
    }));
  }, []);

  const generate = React.useCallback(async () => {
    const validationErrors = validateForm(form, t);
    if (Object.keys(validationErrors).length > 0 || form.questionTypes.length === 0) {
      setErrors(validationErrors);
      setStatus("error");
      showFeedback({ type: "error", message: t.quizGenerator.feedback.validation });
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
      // The client never builds a Blueprint or prompt and never knows
      // whether the server will use the mock service or OpenAI — that
      // choice, and the entire planning stage, happen server-side.
      const generated = await generateQuizViaApi(form, { signal: abortController.signal });
      setQuiz(generated);
      setSavedDocument(null);
      setShowAnswerKey(false);
      setStatus("success");
      showFeedback({ type: "success", message: t.quizGenerator.feedback.generated });
    } catch (error) {
      setStatus("error");
      if (error instanceof DOMException && error.name === "AbortError") {
        showFeedback({ type: "error", message: t.quizGenerator.feedback.requestTimeout });
      } else if (error instanceof QuizApiError && error.message) {
        showFeedback({ type: "error", message: error.message });
      } else {
        showFeedback({ type: "error", message: t.quizGenerator.feedback.generationError });
      }
    } finally {
      window.clearTimeout(timeoutId);
      stageTimers.forEach((id) => window.clearTimeout(id));
    }
  }, [form, t, showFeedback]);

  const updateQuestion = React.useCallback((questionId: string, updater: (question: QuizQuestion) => QuizQuestion) => {
    setQuiz((prev) =>
      prev
        ? { ...prev, questions: prev.questions.map((question) => (question.id === questionId ? updater(question) : question)) }
        : prev
    );
  }, []);

  const toggleEditMode = React.useCallback(() => setIsEditMode((prev) => !prev), []);
  const toggleAnswerKey = React.useCallback(() => setShowAnswerKey((prev) => !prev), []);

  const copyAll = React.useCallback(async () => {
    if (!quiz) return;
    const text = quiz.questions
      .map((question, index) => `${index + 1}. ${question.prompt}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(`${quiz.title}\n\n${text}`);
      showFeedback({ type: "success", message: t.quizGenerator.feedback.copiedAll });
    } catch {
      showFeedback({ type: "error", message: t.quizGenerator.feedback.copyError });
    }
  }, [quiz, t, showFeedback]);

  const save = React.useCallback(() => {
    if (!quiz) return;
    const draft = savedDocument ?? buildDocumentDraft(quiz);
    const result = quizDocumentStore.save({ ...draft, quiz });
    setSavedDocument(result);
    showFeedback({ type: "success", message: t.quizGenerator.feedback.saved });
  }, [quiz, savedDocument, t, showFeedback]);

  const duplicate = React.useCallback(() => {
    if (!quiz) return;
    const source = savedDocument ?? buildDocumentDraft(quiz);
    quizDocumentStore.duplicate({ ...source, quiz });
    showFeedback({ type: "success", message: t.quizGenerator.feedback.duplicated });
  }, [quiz, savedDocument, t, showFeedback]);

  return {
    form,
    errors,
    status,
    loadingStage,
    quiz,
    savedDocument,
    isEditMode,
    showAnswerKey,
    feedback,
    updateField,
    toggleQuestionType,
    toggleVisualType,
    generate,
    regenerate: generate,
    updateQuestion,
    toggleEditMode,
    toggleAnswerKey,
    copyAll,
    save,
    duplicate,
  };
}
