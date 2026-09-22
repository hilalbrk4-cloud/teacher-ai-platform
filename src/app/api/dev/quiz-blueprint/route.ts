import { NextResponse } from "next/server";

import { buildQuizBlueprint } from "@/lib/ai/blueprint/quiz-blueprint";
import { buildQuizPrompt } from "@/lib/ai/prompts/quiz-generator-prompt";
import type { QuizFormInput } from "@/types/quiz-generator";

const SAMPLE_INPUT: QuizFormInput = {
  quizType: "mixedAssessment",
  subject: "Matematik",
  gradeLevel: "6. Sınıf",
  topic: "Kesirler",
  objectives: "Kesirleri karşılaştırabilme\nKesirlerle toplama işlemi yapabilme\nGerçek hayat problemlerinde kesir kullanabilme",
  questionCount: 9,
  questionTypes: ["multipleChoice", "shortAnswer", "matching"],
  questionApproach: "newGeneration",
  cognitiveLevel: "apply",
  difficulty: "mixed",
  visualUsage: "whenAppropriate",
  visualTypes: ["fractionModel", "numberLine"],
  includeAnswerKey: true,
  includeExplanations: true,
};

/**
 * Dev-only inspection route: lets the team sanity-check a Question
 * Blueprint (and the prompt built from it) for sample teacher input
 * without spending an AI call. Mirrors `/api/dev/lesson-plan-prompt`.
 */
export function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 404 });
  }

  const blueprint = buildQuizBlueprint(SAMPLE_INPUT);
  const prompt = buildQuizPrompt(blueprint);

  return NextResponse.json({ blueprint, prompt });
}
