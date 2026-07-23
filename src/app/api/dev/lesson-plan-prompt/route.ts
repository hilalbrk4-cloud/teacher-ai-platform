import { NextResponse } from "next/server";

import { buildLessonPlanPrompt } from "@/lib/ai/prompts/lesson-planner-prompt";
import { runLessonPlanPromptDevChecks } from "@/lib/ai/prompts/lesson-planner-prompt.dev-checks";
import type { LessonPlanFormInput } from "@/types/lesson-planner";

const SAMPLE_INPUT: LessonPlanFormInput = {
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

export function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 404 });
  }

  return NextResponse.json({
    samplePrompt: buildLessonPlanPrompt(SAMPLE_INPUT),
    devChecks: runLessonPlanPromptDevChecks(),
  });
}
