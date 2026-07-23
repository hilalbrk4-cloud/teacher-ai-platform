# EduPilot Feature Specifications

# Lesson Planner

## Status

Current feature to design and implement.

## Product Goal

Help a teacher create a high-quality, structured lesson plan without needing to write a complex AI prompt.

## Initial Scope

Build the user interface and realistic mock generation flow first. Do not connect a real AI API unless explicitly requested.

## Entry Points

- sidebar AI Tools
- Dashboard quick tool card
- Dashboard AI command center
- recent documents

## Recommended Page Structure

### Page Header

Title: `Ders Planlayıcı`

Helper text: `Dersinize uygun, düzenlenebilir bir planı birkaç adımda oluşturun.`

### Guided Input Area

Essential fields:

- Ders
- Sınıf düzeyi
- Konu
- Ders süresi
- Öğrenme hedefleri veya kazanımlar

Optional fields:

- Öğretim yaklaşımı
- Öğrenci düzeyi
- Kullanılacak materyaller
- Ölçme ve değerlendirme tercihi
- Özel gereksinimler
- Ek notlar

Show essential fields first and place advanced options in an expandable area.

### Smart Defaults

- Duration: 40 minutes
- Assessment: short formative assessment
- Language: Turkish
- Output structure: standard lesson plan

### AI Guidance

Example refinements:

- `5E modeline göre hazırla`
- `Grup çalışması ekle`
- `Derse giriş etkinliği öner`
- `Kaynaştırma öğrencisi için uyarlama ekle`

### Primary Action

Button: `Ders Planını Oluştur`

Loading messages:

- `Ders bilgileri inceleniyor…`
- `Etkinlikler hazırlanıyor…`
- `Ölçme bölümü oluşturuluyor…`

### Result View

Editable sections:

- Ders bilgileri
- Öğrenme hedefleri
- Gerekli materyaller
- Derse hazırlık
- Giriş
- Gelişme
- Sonuç
- Ölçme ve değerlendirme
- Farklılaştırma ve uyarlamalar
- Öğretmen notları

### Result Actions

- Düzenle
- Kaydet
- Kopyala
- Yeniden Oluştur
- Kısalt
- Ayrıntılandır
- Word'e Aktar
- PDF'e Aktar

Exports may initially be non-functional UI if document generation is not implemented, but this limitation must be stated.

### Responsive Behavior

Desktop may use a balanced two-column layout. Tablet must preserve hierarchy. Mobile must stack all content and keep the primary action visible.

## AI Integration — Later Phase

The future AI request should be generated from structured teacher inputs and include:

- teacher role
- grade level
- subject
- topic
- duration
- outcomes
- teaching method
- assessment preference
- adaptation needs
- required response structure
- Turkish language requirement

The AI output must remain editable and under teacher control.

### Prompt Builder — implemented (Sprint 2.5)

`src/lib/ai/prompts/lesson-planner-prompt.ts` now implements the above as a
pure, typed function (`buildLessonPlanPrompt`). It is the only place that
turns teacher input into an AI request; teachers never write prompts.

- Structured, typed output (`LessonPlanPrompt`) plus compiled natural-language
  instructions, covering role, all teacher inputs, Turkish language rules,
  pedagogical requirements, and a strict JSON-only output contract.
- The instructions explicitly forbid inventing official MEB curriculum or
  kazanım codes unless the teacher explicitly supplied them, and forbid
  unsupported factual claims.
- `src/lib/ai/schemas/lesson-plan-schema.ts` defines the required JSON
  response shape (matching the existing `LessonPlan` type/section keys) and
  a runtime validator that rejects missing sections or wrong field types.

### OpenAI service foundation — implemented (Sprint 2.5B)

The real generation flow now exists end-to-end server-side:

`Lesson Planner form → buildLessonPlanPrompt → Next.js API route → OpenAI Responses API → validateLessonPlanResponse → typed LessonPlan`

- `src/app/api/lesson-plans/generate/route.ts` — server-only API route that
  re-validates the incoming form input, builds the prompt, calls the
  configured generation service, validates the response, and returns a
  typed `LessonPlan` or a safe Turkish error.
- `src/lib/ai/services/openai-lesson-plan-service.ts` — real
  `LessonPlanGenerationService` implementation using the official `openai`
  SDK's Responses API with JSON-only output.
- `src/lib/ai/services/generation-service-factory.ts` — switches between
  `mock` and `openai` based on `LESSON_PLAN_PROVIDER`, defaulting to `mock`.
- `src/lib/ai/config.ts` — single source of truth for the model name
  (`gpt-4o-mini`) and request timeout.
- The API key is read only from `process.env.OPENAI_API_KEY` server-side,
  never exposed via `NEXT_PUBLIC_`, never logged.

**Still pending / not implemented:**

- **Default provider remains mock.** `LESSON_PLAN_PROVIDER` defaults to
  `mock` whenever unset, so no behavior changes without explicit configuration.
- `.env.example` documents `OPENAI_API_KEY=` with no value; nothing in the
  repo contains a real key — that's supplied per-environment via
  `.env.local`, which stays git-ignored.

### UI connected to the real API route — implemented (Sprint 2.6)

The Lesson Planner UI now calls `/api/lesson-plans/generate` for every
generation and regeneration, via `generateLessonPlanViaApi`
(`src/lib/lesson-planner/lesson-plan-api-client.ts`). The client sends the
raw form input, never a prompt, and never knows or checks which provider
answered — that's decided entirely server-side by `LESSON_PLAN_PROVIDER`.
Whether a teacher's plan comes from the mock service or a real OpenAI call
now depends solely on that server-side setting, with no code or UI change
required to switch between them.
