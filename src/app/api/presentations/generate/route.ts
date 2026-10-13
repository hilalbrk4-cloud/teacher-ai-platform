import { NextResponse } from "next/server";

import { parseCurriculumSelection, resolveCurriculumSelection } from "@/lib/curriculum/repository";
import { getSafePresentationError } from "@/lib/presentation/generation";
import { buildPresentationPrompt } from "@/lib/presentation/prompt";
import { getServerPresentationGenerationService } from "@/lib/presentation/service-factory";
import { PRESENTATION_TYPES, type PresentationFormInput } from "@/types/presentation";

export const runtime = "nodejs";

function parseInput(body: unknown): PresentationFormInput | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  const str = (value: unknown) => (typeof value === "string" ? value.slice(0, 300).trim() : "");
  const subject = str(record.subject);
  const gradeLevel = str(record.gradeLevel);
  const topic = str(record.topic);
  if (!subject || !gradeLevel || !topic) return null;
  if (!(PRESENTATION_TYPES as readonly unknown[]).includes(record.type)) return null;
  if (record.slideCount !== 5 && record.slideCount !== 8) return null;
  return {
    subject,
    gradeLevel,
    topic,
    type: record.type as PresentationFormInput["type"],
    slideCount: record.slideCount,
    curriculum: parseCurriculumSelection(record.curriculum),
  };
}

/** Form → (havuzdan çözülmüş TYMM bağlamı) → prompt → üretim servisi → doğrulanmış sunum. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "invalid_request", message: "Gönderilen istek geçerli bir JSON değil." } }, { status: 400 });
  }
  const input = parseInput(body);
  if (!input) {
    return NextResponse.json({ error: { code: "invalid_request", message: "Gönderilen sunum bilgileri eksik veya geçersiz." } }, { status: 400 });
  }
  try {
    const curriculum = resolveCurriculumSelection(input.curriculum);
    const presentation = await getServerPresentationGenerationService().generate(buildPresentationPrompt(input, curriculum));
    return NextResponse.json({ presentation });
  } catch (error) {
    const safe = getSafePresentationError(error);
    console.error(`[EduPilot] Presentation generation failed: ${safe.code}`);
    for (const detail of safe.details ?? []) console.error(`  - [${detail.rule}] ${detail.label}: ${detail.message}`);
    return NextResponse.json({ error: safe }, { status: safe.code === "timeout" ? 504 : 502 });
  }
}
