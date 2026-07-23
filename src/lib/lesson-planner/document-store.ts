import type { LessonPlanDocument } from "@/types/lesson-planner";
import { createLessonPlannerId } from "@/lib/lesson-planner/id";

/**
 * Minimal in-memory mock store. Only covers what today's Save / Continue
 * Editing / Duplicate UI actions need — intentionally not a real
 * persistence or history system.
 */
const documents = new Map<string, LessonPlanDocument>();

export const lessonPlanDocumentStore = {
  save(document: LessonPlanDocument): LessonPlanDocument {
    const now = new Date().toISOString();
    const isExisting = documents.has(document.id);
    const saved: LessonPlanDocument = {
      ...document,
      status: "saved",
      createdAt: isExisting ? document.createdAt : now,
      updatedAt: now,
    };
    documents.set(saved.id, saved);
    return saved;
  },

  duplicate(document: LessonPlanDocument): LessonPlanDocument {
    const now = new Date().toISOString();
    const copy: LessonPlanDocument = {
      ...document,
      id: createLessonPlannerId("lp"),
      title: `${document.title} (Kopya)`,
      status: "saved",
      createdAt: now,
      updatedAt: now,
    };
    documents.set(copy.id, copy);
    return copy;
  },
};
