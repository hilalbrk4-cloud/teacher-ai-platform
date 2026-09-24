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

# Quiz Generator — Visual Question Types (`gorselSoru`)

A registry-based, multi-type visual question architecture. A teacher enables
it by selecting the **Görsel yeni nesil** question type; for each such
Blueprint slot, the model picks the most suitable `tip` itself and returns
`{ "tip": "...", "veri": {...} }`.

- **Definitions (server-safe, no React):** `src/lib/quiz-generator/gorsel-sorular/`
  — each tip carries its key, `veri` schema + validator, prompt example,
  `gorselKategorisi` and `gorselStratejisi`. `tanimlar.ts` aggregates them.
- **Registry + router (client):** `src/components/features/quiz-generator/gorsel-sorular/`
  — `registry.ts` adds a React component to each definition;
  `gorsel-soru-router.tsx` renders a question by its `tip`, so different
  tips can coexist in one quiz.
- **Functional visuals** (`sayi_dogrusu`, `kesir_kartlari`) are drawn as SVG
  from `veri`. The validator recomputes the correct answer from the data
  and rejects a response whose `dogruSecenekId` disagrees, or where the
  correct answer isn't in exactly one option.
- **Decorative visuals** (`gercek_hayat_senaryo` scenes) live in a separate
  layer (`dekoratif-gorsel.tsx`). Changing the tip's `gorselStratejisi`
  (`svg` → `hazirGorsel` / `yapayZeka` / `yok`) swaps the provider without
  touching question logic. Only `svg` is implemented; `hazirGorsel` expects
  `public/gorseller/sahneler/<sahne>.webp` (no files yet); `yapayZeka` is a
  placeholder that renders nothing.
- **Prompt:** `buildGorselSoruBlock` lists every tip suitable for the
  subject (fraction tips are math-only) with its schema, rules and an
  example that is guaranteed to pass its own validator (covered by tests).

### Tasks (görevler) and the visual-question plan

Each tip has several tasks, each with its own schema, rules and example:
`sayi_dogrusu` → siralama, hedefeEnYakin, isaretliKesir, kesriGoster;
`kesir_kartlari` → ifadeDegerlendirme, turuBul, gosterimDonusumu;
`gercek_hayat_senaryo` → karsilastirma, kalaniBulma, coklugunKesri, cokAdimliCikarim.
The Blueprint (`gorselSoruPlaniAta`) assigns a tip + task to every
`gorselSoru` slot: each suitable tip is used once before any repeats, and
a repeated tip always gets a different task. Fraction tips/tasks are only
assigned when the topic or outcomes mention fractions. The prompt shows
only the assigned tasks, and the validator rejects a response that deviates
from the plan. Scenario questions must carry ≥2 `islemAdimlari`, and a
single-fraction answer that already appears in the scenario is rejected.

### Generation reliability (real OpenAI)

- **Batching:** `generateQuizInBatches` (`src/lib/quiz-generator/batch-generation.ts`)
  splits the Blueprint into near-equal batches of at most `QUIZ_BATCH_SIZE`
  (3) questions, runs up to `QUIZ_BATCH_CONCURRENCY` (4) in parallel, and
  merges them in plan order. A batch that fails validation is regenerated
  once on its own; if it fails again the whole request fails (a quiz with
  missing questions is never returned). Knowledge Pack pattern coverage is
  still computed over the full quiz. Each batch gets its own context areas
  and a rotating suggested `tip` so parallel batches don't converge on the
  same scenario or tip.
- **Structured outputs:** `buildQuizResponseJsonSchema` sends a strict JSON
  Schema (field names, required fields, enums) whenever a batch has no
  free-form classic `visual`; otherwise plain JSON mode is used.
  `cozum` / `answerExplanation` come before the answer fields so the model
  solves first.
- **Repair instead of reject (functional tips only):** when the model marks
  the wrong option, or the correct answer is missing from the options, the
  answer key is repaired from the data and `cozum` is regenerated from the
  data. Duplicate options are dropped (≥3 must remain); unknown/duplicate
  card colors are remapped. A stem that asks the opposite of `siralama` /
  `soruBicimi` is still rejected, as are questions where every student is
  right (or wrong).

To add a tip: add its key to `GORSEL_SORU_TIPLERI` and its data type to
`GorselSoruVeriHaritasi`, write its definition, then register its
component — TypeScript's mapped types fail the build if any step is missed.
