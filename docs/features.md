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

### 5E Model (TYMM)

When `5E modeline göre hazırla` is selected, the plan has no Giriş / Gelişme / Sonuç / Ölçme sections. The lesson flow is these five phase sections:

1. Girme
2. Keşfetme
3. Açıklama
4. Derinleştirme
5. Değerlendirme

- **Time ranges:** each phase has a minute range computed by code (weights 10/30/20/25/15, at least 2 minutes per phase). The ranges always sum exactly to the lesson duration; for 40 minutes they are 00–04, 04–16, 16–24, 24–34 and 34–40. The model never sets the times.
- **Required content:** Değerlendirme must contain a numbered "Çıkış Bileti", and Keşfetme carries the EduPilot Spark activity. The validator rejects a plan that lacks either and regenerates once.
- **TYMM Beceriler Örgüsü:** every plan, 5E or classic, carries KB / SDB / Eğilimler / Değerler labels. They are chosen from fixed lists in `src/lib/lesson-planner/tymm-skills.ts`; numbered program codes are never invented.
- **Preview:** each phase card shows a phase badge and a minute-range badge, both before and after generation. The skills appear as a badge card under the plan.

### MEB Curriculum Pool (Müfredat Havuzu)

**Data**
- Source: the MEB framework annual plan workbooks in `references/*.xlsx`.
- Coverage: Fen, Matematik, Sosyal Bilgiler, Türkçe, İnkılap Tarihi and İngilizce, grades 2–8, 26 grade files in total.
- Run `npm run curriculum:parse` (`scripts/parse-all-curricula.ts`) to regenerate `src/data/curriculum/`: one JSON file per grade, plus `index.json` and the generated `registry.ts`. Never edit these files by hand.
- The parser classifies columns by header text (TYMM, the previous program and English headers), recognises outcome codes by pattern, splits rows that span two units, repairs truncated codes and normalizes SDB/D/OB labels.
- Each grade file is tagged `tymm` or `onceki` (previous program: kazanım + açıklama, no SDB/D/OB).

**Form flow**
1. When Ders + Sınıf match the pool, the Konu field becomes a searchable combobox grouped by unit. Free text is still allowed.
2. Selecting a topic opens the "MEB TYMM Resmi Öğrenme Çıktıları" picker.
3. Each selected outcome adds a `KOD — metin` line to the objectives textarea; unselecting removes it. The teacher's own lines are kept.
4. The picker previews the SDB, Değerler and OB items that will be included.

**Pipeline**
- The client sends only IDs and codes.
- The server resolves them against the pool (`resolveCurriculumSelection`), dropping unknown or foreign codes, and passes the result to `buildLessonPlanPrompt(input, { curriculum })`.
- After generation, `applyOfficialCurriculum` attaches the official codes, SDB, Değerler and OB to the plan in code. They appear in the TYMM Beceriler Örgüsü card and in the Word export.

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
`gercek_hayat_senaryo` → karsilastirma, kalaniBulma, coklugunKesri, bolmeEnFazla,
birimOlcekleme, parcaButun, kesirSiralama, olabilirCikarim, denklikOlamaz,
cokAdimliCikarim (araliklar exists but is excluded from plans).
Each scenario task is one problem family from
`references/senaryo-kalite-referans-v2.md` (Aile 1 → parcaButun, 2+3 →
kesirSiralama, 4 → coklugunKesri incl. the exam context, 5 → bolmeEnFazla,
6 → karsilastirma, 7 → olabilirCikarim, M2 → denklikOlamaz; M1 "step
ordering" needs a step-list display and is not implemented yet).
The Blueprint (`gorselSoruPlaniAta`) assigns a tip + task to every
`gorselSoru` slot, weighted toward multi-step work: simple visual-reading
questions (`sayi_dogrusu`, `kesir_kartlari`) get ⌊n/3⌋ slots, at most 2
(1 in a 5-question quiz), placed on the easiest slots and from different
tips; every other slot is a multi-step scenario, each family used once
before any repeats, and each context topic (`konu`: market, tarım, spor…)
avoided if an earlier scenario in the quiz already used it.
Inference tasks (`kesirSiralama`, `olabilirCikarim`, `denklikOlamaz`,
`senaryo-cikarim.ts`) follow the same "data is the source of truth" rule:
code builds the data, the correct answer and error-model distractors; the
model writes only the text, which must contain the planned values, names,
key phrases and stem wording and must not reveal the answer. Fraction tips/tasks are only
assigned when the topic or outcomes mention fractions. The prompt shows
only the assigned tasks, and the validator rejects a response that deviates
from the plan. Scenario questions must carry ≥2 `islemAdimlari`, and a
single-fraction answer that already appears in the scenario is rejected.

### TYMM rules (CLAUDE.md, `references/senaryo-kalite-referans-v2.md`)

- "Görsel yeni nesil" (fraction topics): EVERY question gets a functional
  visual — all `gorselSoru` slots are planned visual tips (tips matching the
  topic first, at most twice, then the others once). Text-only scenarios are
  used only for non-fraction topics. The pure-definition card task
  (`ifadeDegerlendirme`) is excluded from plans.
- Each planned task draws its context from a sector pool (inşaat, enerji,
  lojistik, tarım, laboratuvar, teknoloji, ulaşım, meteoroloji, perakende…);
  every context requires its own sector keyword in the text, so the model
  cannot reuse the prompt example of another sector, and the context-pool
  constraint keeps every question of a quiz (up to 8) in a different context.

- Single-step reading/matching tasks are excluded from plans
  (`plandanCikarildi`): all four emoji `sayi_dogrusu` tasks, `kesir_kartlari`
  `turuBul` / `gosterimDonusumu`. The only "simple" slot left is the card
  reasoning task (`ifadeDegerlendirme`), at most once per quiz.
- Scenario questions draw no decorative scene (`gorselStratejisi: "yok"`):
  a visual must carry data that is only readable from it.
- HEDEF-model tasks: `etap_dogrusu/etapFarki` (number line with differently
  partitioned units, K/L points, two-stage difference), `alan_izgara/damlamaUcu`
  (empty ratio ÷ unit fraction, grade 6) and `bosAlanOlcusu`,
  `cetvel_olcum/kamaBolme` (read length ÷ fraction, "at most", grade 6) and
  `kalanParca`, `daire_kesir/kalanPaylasim` (remaining ÷ guests, grade 6). The
  rejected models (grid "empty part", ruler "how much longer", pie "how much
  is left") were removed.
- `daire_kesir/boyaKarisimi` replaced the pizza slice count: the circle is a
  paint-mixture diagram (count compartments × fraction × litres per compartment).
- Context pool constraint: planned visual tips retry seeds and then other
  tasks of the same tip until they find a context topic (`konu`) not yet used
  in the quiz; ruler tasks have three contexts (çıta, kurdele, kablo). For
  quizzes up to 8 questions no topic repeats (test-covered).
- `etap_dogrusu` is drawn at 1:1 pixel scale from the measured container
  width (min 260 px, horizontal scroll below that), so labels keep their size
  on mobile.
- The prompt states the three TYMM rules; distractors include the required
  misconceptions (adding numerators and denominators, counting lines instead
  of intervals, ratio to the remainder).

### Planned visual model tips (`references/gorsel-tip-haritasi.md`)

Five drawn models: `daire_kesir` (pizza/pie; pattern:
`references/daire-kesir-demo.html`), `kesir_cubugu` (bar strips),
`alan_izgara` (area grid), `tablo_kesir` (fraction table), `cetvel_olcum`
(ruler). Each follows "the visual is drawn from data, code computes the
answer, inconsistency is rejected":

- The Blueprint builds two plans per question: `cizim` (the drawing data)
  and `cikarim` (values the text must contain, the correct answer and
  error-model distractors). Generators live next to each definition
  (`daire-kesir.ts`, `kesir-cubugu.ts`, …).
- The model writes only `{gorev, senaryo, soru}`. `planliGorselDogrula`
  (`planli-gorsel.ts`) rejects text that misses a planned value, name or key
  phrase, contains an unplanned number (would leak the answer or contradict
  the drawing), or fails the language check. Options and the solution come
  from the plan, so the drawing and the answer cannot disagree.
- Counts that are visible in the drawing (slices, parts, squares, positions,
  table values) are never written in the text; the student reads them and
  then performs at least one more operation.
- Distribution: simple reading questions ⌊n/3⌋ (max 2); of the remaining
  slots at most half are planned visual tips (each tip at most twice,
  interleaved with scenarios); a tip whose topic words appear in the
  outcomes (pizza/paylaşma, şerit, alan/ızgara, tablo/veri, ölçme/cetvel) is
  preferred, otherwise the tip order is shuffled per topic seed.
- `planli-gorsel.test.ts`: for 300 seeds per task, the correct option is
  recomputed independently from the drawing data.

### Scenario questions: arithmetic is guaranteed by code

Quality target: `references/senaryo-kalite-referans.md` (its 7-point checklist
and three reference questions are in the prompt).

- **Numbers are chosen by code** (`senaryo-sayilari.ts`), backwards from
  the answer, and attached to the slot's plan: in real runs gpt-4o could
  not reliably pick numbers satisfying the constraints (integer counts,
  whole intervals). The model writes the context, the structured `hesap`
  and the distractors around the given numbers.
- **The model's `hesap` is recomputed with exact fraction arithmetic**
  (`kesir-aritmetigi.ts`). It must reach the planned answer, use every
  number in the scenario (and only those), contain a fraction operation,
  and the model's marked option must equal the code's answer. Counted
  things must be whole numbers. The explanation is generated from `hesap`.
  Otherwise the question is rejected and regenerated.
- Fraction multiplication/division tasks (`bolmeEnFazla`, `birimOlcekleme`)
  are only assigned from grade 6 (MEB). `araliklar` (fencepost) is
  implemented but **excluded from plans**: in 3/3 real runs the model
  described the endpoints in a way that contradicted the ±1 step — a
  semantic mismatch code can't detect.
- Only rejected questions are regenerated, with the rejection reasons as
  feedback (`generateQuizInBatches`).

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

# Rubric Generator (Rubrik Oluşturucu)

Route: `/ai-tools/rubric-generator`. The Dashboard card already pointed to this route, so the Dashboard itself was not changed.

## Form (left panel)
- **Ders, Sınıf, Konu:** connected to the curriculum pool (`src/data/curriculum/`). It uses the same topic combobox and outcome picker as the Lesson Planner, from `components/features/curriculum/`.
- **Outcomes:** selecting a topic preselects all of its official outcomes; the teacher can narrow the selection.
- **Görev türü:** proje, sunum, deney, grup, portfolyo.
- **Rubrik tipi:** analitik, bütüncül, akran/öz.
- **Skala:** 3 (Geliştirilmeli → Mükemmel) or 4 (Yetersiz → Çok İyi).

## Dual-view data model (`src/types/rubric.ts`)

Each criterion has two texts:
- `teacherCriterion`: formal, third person, with one level descriptor per level.
- `studentFriendlyCriterion`: a "sen dili" yes/no question plus a hint.

Each criterion also has `skillCodes` (official codes from the pool) and `conceptualSkills` (KB labels, no codes).

**Scoring (computed by code, not by the model):**
- Weights are normalized to multiples of 5 that sum to exactly 100.
- Level points go up to each criterion's weight.
- Holistic rubrics use score bands (for example 0–25 / 26–50 / 51–75 / 76–100).

## Validation (`src/lib/rubric/schema.ts`)
- Strict json_schema; `skillCodes` is an enum of the allowed codes, and the field is omitted entirely when no curriculum topic is selected.
- Teacher text may not contain questions or "sen" forms.
- Student questions must end with "?" and contain no codes and no "öğrenci".
- Each criterion must have exactly `scale` levels, and they must be distinct.
- Every selected outcome must be covered by some criterion, and at least one SDB and one Değer must be used.
- A rejected response is regenerated once, with the issues fed back.

## Preview (right panel)
- Base UI Tabs:
  - "Öğretmen Rubriği (Resmî MEB Formatı)": TYMM summary (unused pool codes dimmed), plus a table or criterion cards depending on the panel width (container query).
  - "Öğrenci Dostu Kontrol Listesi (Öz/Akran)": checkbox card; öz/akran rubrics get Ben and Akranım columns.

## Exports (`src/lib/rubric/rubric-docx.ts`)
- **Official rubric:** landscape A4 with the MEB header, info table, TYMM table, scored scale, student/total line, and 3 zümre signatures plus "Uygundur / Okul Müdürü".
- **Student sheet:** landscape A4 split into two identical A5 forms with a dashed cut line; no codes, "sen dili" only.

## API
- `POST /api/rubrics/generate`.
- Provider: `RUBRIC_PROVIDER`, falling back to `LESSON_PLAN_PROVIDER`; mock by default.
- Model: gpt-4o.

## Live Assessment (Canlı Değerlendirme)

A third tab in the rubric preview. While it is open, the rubric form is hidden and the workspace is full width; the teacher can bring the form back with "Rubrik formunu göster".

**Class list**
- The teacher pastes a list copied from e-Okul or Excel (`src/lib/rubric/live/roster.ts`).
- Separators: tab, `;`, `,`, or plain lines.
- Columns: sıra no + okul no are recognized; header rows and the gender column are skipped.
- All-caps names are title-cased.
- Student IDs depend only on okul no + name, so re-pasting the list keeps existing scores.

**Scoring**
- Each criterion is a card with keyboard-accessible level buttons (radiogroup), ordered highest to lowest.
- The total (e.g. "85 / 100") updates live in a sticky header below the app top bar.
- Holistic rubrics use a single level plus a score clamped to that level's range.

**Feedback** (`generateLiveFeedback`)
- Rule-based and instant, written in "sen dili", 1–2 sentences.
- Strengths come from the highest-level criteria; the growth area is the lowest-level criterion together with its student hint from the rubric.
- The tone is chosen from the overall score ratio.
- Once the teacher edits the text, it is never overwritten automatically; a "Otomatik metne dön" button restores the generated text.

**Storage**
- React state is mirrored to localStorage.
- The roster is stored once and reused across rubrics (`edupilot.liveAssessment.roster`).
- Scores are stored per rubric (`edupilot.liveAssessment.session.<rubricId>`).
- Storage failures (private mode, blocked storage) are ignored safely.

**Excel export**
- `exceljs` is loaded on click.
- Columns: No, Ad Soyad, K1…Kn points (max in header), Toplam, Durum, Geri Bildirim.
- Includes a class average row, frozen header and name columns, and landscape page setup.
