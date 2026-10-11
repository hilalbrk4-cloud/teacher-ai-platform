import { NextResponse } from "next/server";
import OpenAI from "openai";

import { getOpenAiApiKey, getRubricProvider } from "@/lib/ai/config";
import { NAME_PLACEHOLDER, validateAiFeedback, type LiveFeedbackRequest } from "@/lib/rubric/live/ai-feedback";

export const runtime = "nodejs";

/** Kısa metin; hız için küçük model yeterli. */
const FEEDBACK_MODEL = "gpt-4o-mini";
const FEEDBACK_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 2;

function parseRequest(body: unknown): LiveFeedbackRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  const str = (value: unknown, max = 200) => (typeof value === "string" ? value.slice(0, max) : "");
  if (!Array.isArray(record.criteria) || record.criteria.length === 0 || record.criteria.length > 8) return null;
  const criteria = record.criteria.map((raw) => {
    const item = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
    return {
      title: str(item.title, 120),
      level: str(item.level, 40),
      points: Number(item.points) || 0,
      max: Number(item.max) || 0,
      hint: str(item.hint, 200),
    };
  });
  const holistic =
    typeof record.holistic === "object" && record.holistic !== null
      ? { level: str((record.holistic as Record<string, unknown>).level, 40), description: str((record.holistic as Record<string, unknown>).description, 300) }
      : undefined;
  return {
    subject: str(record.subject, 80),
    gradeLevel: str(record.gradeLevel, 40),
    topic: str(record.topic, 120),
    taskTitle: str(record.taskTitle, 160),
    total: Math.max(0, Math.min(100, Number(record.total) || 0)),
    criteria,
    holistic,
  };
}

function buildInstructions(request: LiveFeedbackRequest, issue?: string): string {
  const performance = request.holistic
    ? `Genel düzey: ${request.holistic.level} (${request.holistic.description}). Ölçütler: ${request.criteria.map((item) => item.title).join(", ")}.`
    : request.criteria.map((item) => `- ${item.title}: ${item.level} (${item.points}/${item.max} puan). İpucu: ${item.hint}`).join("\n");
  return [
    "Deneyimli ve sıcak bir öğretmen olarak, bir ortaokul öğrencisine görevine ilişkin yapıcı geri bildirim yaz.",
    `Ders: ${request.subject} · ${request.gradeLevel} · Konu: ${request.topic} · Görev: ${request.taskTitle} · Toplam: ${request.total}/100`,
    "Değerlendirme:",
    performance,
    "KURALLAR:",
    `- Tam olarak 1-2 cümle, "sen" diliyle, doğrudan öğrenciye hitap et. Öğrencinin adı yerine birebir ${NAME_PLACEHOLDER} yaz (ör. "${NAME_PLACEHOLDER}, …").`,
    "- Önce en güçlü yönünü somut olarak takdir et, sonra en çok gelişmesi gereken ölçüt için uygulanabilir tek bir öneri ver (ipucundan yararlan).",
    "- Puan, not, \"öğrenci\" kelimesi ve genel geçer övgü (\"harika\", \"süper\") kullanma; yargılayıcı olma.",
    issue ? `ÖNCEKİ YANIT REDDEDİLDİ: ${issue} Bunu düzelt.` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Mock sağlayıcı: API anahtarı olmadan da akış denenebilsin diye basit şablon. */
function mockFeedback(request: LiveFeedbackRequest): string {
  const sorted = [...request.criteria].sort((a, b) => b.points / (b.max || 1) - a.points / (a.max || 1));
  const best = sorted[0];
  const weakest = sorted.at(-1);
  if (request.holistic) return `${NAME_PLACEHOLDER}, ${request.holistic.description} Kontrol listendeki soruları kendine sorarak bir üst düzeye çıkabilirsin.`;
  return `${NAME_PLACEHOLDER}, “${best.title}” ölçütündeki çaban dikkat çekiyor. Bir sonraki adımda “${weakest?.title}” için şunu dene: ${weakest?.hint}`;
}

/**
 * Canlı Değerlendirme için AI geri bildirim cümlesi. Öğrenci adı bu
 * uç noktaya hiç gelmez; yanıt {AD} yer tutucusuyla döner.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "invalid_request", message: "Geçersiz istek." } }, { status: 400 });
  }
  const input = parseRequest(body);
  if (!input) return NextResponse.json({ error: { code: "invalid_request", message: "Geri bildirim için en az bir kriter puanlanmalı." } }, { status: 400 });

  if (getRubricProvider() !== "openai") return NextResponse.json({ feedback: mockFeedback(input), source: "mock" });
  const apiKey = getOpenAiApiKey();
  if (!apiKey) return NextResponse.json({ error: { code: "missing_api_key", message: "Yapay zekâ servisi yapılandırılmamış." } }, { status: 502 });

  const client = new OpenAI({ apiKey, timeout: FEEDBACK_TIMEOUT_MS });
  let issue: string | undefined;
  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const response = await client.responses.create({
        model: FEEDBACK_MODEL,
        input: buildInstructions(input, issue),
        text: {
          format: {
            type: "json_schema",
            name: "feedback",
            strict: true,
            schema: { type: "object", additionalProperties: false, required: ["feedback"], properties: { feedback: { type: "string" } } },
          },
        },
      });
      const feedback = String((JSON.parse(response.output_text || "{}") as { feedback?: unknown }).feedback ?? "").trim();
      issue = validateAiFeedback(feedback) ?? undefined;
      if (!issue) return NextResponse.json({ feedback, source: "openai" });
      console.warn(`[EduPilot] Live feedback attempt ${attempt} rejected: ${issue}`);
    }
  } catch (error) {
    console.error("[EduPilot] Live feedback failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: { code: "provider_error", message: "AI geri bildirimi alınamadı." } }, { status: 502 });
  }
  return NextResponse.json({ error: { code: "schema_validation_failed", message: `AI geri bildirimi kalite kontrolünden geçemedi: ${issue}` } }, { status: 502 });
}
