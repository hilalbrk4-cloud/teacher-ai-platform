import { buildLessonPlanPrompt } from "@/lib/ai/prompts/lesson-planner-prompt";
import { validateLessonPlanResponse } from "@/lib/ai/schemas/lesson-plan-schema";
import {
  EDUPILOT_SPARK_MARKER,
  SPARK_FIELD_LABELS,
  TEACHER_COACH_LABELS,
  TEACHING_STRATEGIES,
} from "@/lib/lesson-planner/teaching-library";
import { LESSON_PLAN_SECTION_ORDER } from "@/types/lesson-planner";
import type { LessonPlanFormInput } from "@/types/lesson-planner";

/**
 * Deterministic examples and assertions for the Lesson Planner Prompt
 * Builder. The project has no test runner yet, so these are plain,
 * dependency-free checks meant to be run from a developer/debug context
 * (see `runLessonPlanPromptDevChecks`) rather than a CI test command.
 * Nothing here is imported by the teacher-facing UI.
 */

const FULL_SAMPLE_INPUT: LessonPlanFormInput = {
  subject: "Fen Bilimleri",
  gradeLevel: "7. Sınıf",
  topic: "Fotosentez",
  duration: 40,
  objectives: "Fotosentezin aşamalarını açıklayabilme\nKloroplastın rolünü tanımlayabilme",
  teachingApproach: "Aktif öğrenme",
  studentLevel: "Karma seviye",
  materials: "Çalışma kâğıdı, projeksiyon",
  assessmentPreference: "Kısa sınav",
  specialNeeds: "Görme güçlüğü olan bir öğrenci için büyük punto materyal",
  additionalNotes: "Laboratuvar erişimi yok",
  refinements: ["fiveE", "groupWork"],
};

const MINIMAL_SAMPLE_INPUT: LessonPlanFormInput = {
  subject: "Matematik",
  gradeLevel: "5. Sınıf",
  topic: "Kesirler",
  duration: 40,
  objectives: "Kesirleri karşılaştırabilme",
  teachingApproach: "",
  studentLevel: "",
  materials: "",
  assessmentPreference: "",
  specialNeeds: "",
  additionalNotes: "",
  refinements: [],
};

export interface DevCheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

function check(name: string, passed: boolean, detail?: string): DevCheckResult {
  return { name, passed, detail };
}

export function runLessonPlanPromptDevChecks(): DevCheckResult[] {
  const results: DevCheckResult[] = [];

  const fullPrompt = buildLessonPlanPrompt(FULL_SAMPLE_INPUT);
  const minimalPrompt = buildLessonPlanPrompt(MINIMAL_SAMPLE_INPUT);

  results.push(
    check(
      "required input is included",
      [
        FULL_SAMPLE_INPUT.subject,
        FULL_SAMPLE_INPUT.gradeLevel,
        FULL_SAMPLE_INPUT.topic,
        String(FULL_SAMPLE_INPUT.duration),
      ].every((value) => fullPrompt.instructions.includes(value))
    )
  );

  results.push(
    check(
      "optional empty fields are omitted (no 'undefined' / empty labels)",
      !minimalPrompt.instructions.includes("undefined") &&
        !minimalPrompt.instructions.includes("Öğretim yaklaşımı:") &&
        !minimalPrompt.instructions.includes("Kullanılacak materyaller:") &&
        !minimalPrompt.instructions.includes("Özel gereksinimler")
    )
  );

  results.push(
    check(
      "selected refinements are included",
      fullPrompt.instructions.includes("5E modelinin beş aşamasına") &&
        fullPrompt.instructions.includes("grup çalışması")
    )
  );

  results.push(check("Turkish output instructions are included", fullPrompt.instructions.includes("Türkçe")));

  results.push(
    check(
      "required JSON keys are specified",
      LESSON_PLAN_SECTION_ORDER.every((key) => fullPrompt.instructions.includes(`"${key}"`))
    )
  );

  const inputSnapshot = JSON.stringify(FULL_SAMPLE_INPUT);
  buildLessonPlanPrompt(FULL_SAMPLE_INPUT);
  results.push(check("the input object is not mutated", JSON.stringify(FULL_SAMPLE_INPUT) === inputSnapshot));

  const incompleteResponse = {
    id: "plan-1",
    subject: "Fen Bilimleri",
    gradeLevel: "7. Sınıf",
    topic: "Fotosentez",
    duration: 40,
    generatedAt: new Date().toISOString(),
    sections: [{ key: "dersBilgileri", content: "Ders: Fen Bilimleri" }],
  };
  const validation = validateLessonPlanResponse(incompleteResponse);
  results.push(check("schema rejects a response missing required sections", validation.success === false));

  const wrongTypeResponse = {
    ...incompleteResponse,
    duration: "kirk dakika",
  };
  const typeValidation = validateLessonPlanResponse(wrongTypeResponse);
  results.push(check("schema rejects invalid field types", typeValidation.success === false));

  results.push(
    check(
      "EduPilot Spark marker is required in the prompt",
      fullPrompt.instructions.includes(EDUPILOT_SPARK_MARKER)
    )
  );

  results.push(
    check(
      "all nine Teacher Coach labels are required in the prompt",
      TEACHER_COACH_LABELS.every((item) => fullPrompt.instructions.includes(`"${item.emoji} ${item.label}"`))
    )
  );

  results.push(
    check(
      "EduPilot Spark is required to be a full multi-field activity, not a one-liner",
      SPARK_FIELD_LABELS.every((item) => fullPrompt.instructions.includes(`"${item.label}"`))
    )
  );

  results.push(
    check(
      "prompt offers a strategy library instead of always defaulting to 5E",
      TEACHING_STRATEGIES.length > 10 && fullPrompt.instructions.includes(TEACHING_STRATEGIES[1])
    )
  );

  return results;
}
