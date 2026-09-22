import { createQuizGeneratorId } from "@/lib/quiz-generator/id";
import type { QuizDocument } from "@/types/quiz-generator";

/**
 * Minimal in-memory mock store. Only covers what today's Save / Duplicate
 * UI actions need — intentionally not a real persistence or history
 * system. Mirrors `lessonPlanDocumentStore`'s shape; kept as a separate,
 * quiz-specific store rather than generalizing the two now (see
 * architecture plan, Risk: Document store duplication).
 */
const documents = new Map<string, QuizDocument>();

export const quizDocumentStore = {
  save(document: QuizDocument): QuizDocument {
    const now = new Date().toISOString();
    const isExisting = documents.has(document.id);
    const saved: QuizDocument = {
      ...document,
      status: "saved",
      createdAt: isExisting ? document.createdAt : now,
      updatedAt: now,
    };
    documents.set(saved.id, saved);
    return saved;
  },

  duplicate(document: QuizDocument): QuizDocument {
    const now = new Date().toISOString();
    const copy: QuizDocument = {
      ...document,
      id: createQuizGeneratorId("quiz-doc"),
      title: `${document.title} (Kopya)`,
      status: "saved",
      createdAt: now,
      updatedAt: now,
    };
    documents.set(copy.id, copy);
    return copy;
  },
};
