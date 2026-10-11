import { NextResponse } from "next/server";

import { parseCurriculumSelection, resolveCurriculumSelection } from "@/lib/curriculum/repository";
import { getSafeRubricError } from "@/lib/rubric/generation";
import { buildRubricPrompt } from "@/lib/rubric/prompt";
import { getServerRubricGenerationService } from "@/lib/rubric/service-factory";
import { RUBRIC_TASK_TYPES, RUBRIC_TYPES, type RubricFormInput } from "@/types/rubric";

export const runtime = "nodejs";

const MAX_TEXT = 600;

/** Güvenilmeyen istek gövdesini tipli forma çevirir; eksik/geçersizse null. */
function parseRubricInput(body: unknown): RubricFormInput | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  const str = (value: unknown) => (typeof value === "string" ? value.slice(0, MAX_TEXT) : "");
  const subject = str(record.subject).trim();
  const gradeLevel = str(record.gradeLevel).trim();
  const topic = str(record.topic).trim();
  if (!subject || !gradeLevel || !topic) return null;
  if (!(RUBRIC_TASK_TYPES as readonly unknown[]).includes(record.taskType)) return null;
  if (!(RUBRIC_TYPES as readonly unknown[]).includes(record.rubricType)) return null;
  if (record.scale !== 3 && record.scale !== 4) return null;
  return {
    subject,
    gradeLevel,
    topic,
    taskType: record.taskType as RubricFormInput["taskType"],
    rubricType: record.rubricType as RubricFormInput["rubricType"],
    scale: record.scale,
    taskDescription: str(record.taskDescription),
    curriculum: parseCurriculumSelection(record.curriculum),
  };
}

/**
 * Rubrik formu → (havuzdan çözülmüş TYMM bağlamı) → prompt → üretim servisi
 * (mock veya OpenAI) → doğrulanmış, puanları koddan hesaplanmış `Rubric`.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "invalid_request", message: "Gönderilen istek geçerli bir JSON değil." } }, { status: 400 });
  }

  const input = parseRubricInput(body);
  if (!input) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Gönderilen rubrik bilgileri eksik veya geçersiz." } },
      { status: 400 }
    );
  }

  try {
    const curriculum = resolveCurriculumSelection(input.curriculum);
    const prompt = buildRubricPrompt(input, curriculum);
    const rubric = await getServerRubricGenerationService().generate(prompt);
    return NextResponse.json({ rubric });
  } catch (error) {
    const safe = getSafeRubricError(error);
    console.error(`[EduPilot] Rubric generation failed: ${safe.code}`);
    for (const detail of safe.details ?? []) console.error(`  - [${detail.rule}] ${detail.label}: ${detail.message}`);
    if (!safe.details && process.env.NODE_ENV !== "production" && error instanceof Error) console.error("  ", error.message);
    const status = safe.code === "timeout" ? 504 : 502;
    return NextResponse.json({ error: safe }, { status });
  }
}
