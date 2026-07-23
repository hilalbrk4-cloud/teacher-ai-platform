# EduPilot Roadmap

## Completed

### Sprint 1 — Dashboard v1

Status: Complete

Dashboard should not be modified unless explicitly requested.

## Current Sprint

### Sprint 2 — Lesson Planner

Goal: Build EduPilot's flagship teacher workflow for generating structured, editable lesson plans.

Phases:

1. Product and UX specification
2. Lesson Planner interface
3. Mock generation flow
4. Editable result view
5. Save and export interface
6. AI provider integration later
7. Testing and refinement
8. Git commit and push

### Sprint 2.5 — Lesson Planner Prompt Builder

Status: Prompt Builder implemented. Real AI provider integration is still pending.

- `src/lib/ai/prompts/lesson-planner-prompt.ts` converts structured teacher
  input (`LessonPlanFormInput`) into a typed, complete AI request
  (`LessonPlanPrompt`), including compiled natural-language instructions.
  Teachers never write a prompt themselves.
- `src/lib/ai/schemas/lesson-plan-schema.ts` defines the required response
  shape and a runtime validator so a future AI response can be safely
  rejected if it is missing sections or has the wrong field types.
- The mock generation service still produces all visible results — the
  Prompt Builder output is not yet sent to a real model.
- The compiled prompt is only ever visible in dev-only channels (a
  `NODE_ENV`-gated console log and a `NODE_ENV`-gated `/api/dev/...` route),
  never in the teacher-facing UI.
- The prompt explicitly requires JSON-only output and forbids inventing
  official MEB curriculum/kazanım codes unless the teacher supplied them.

### Sprint 2.5B — Real AI Service Foundation

Status: OpenAI service foundation implemented. Default provider remains
mock. Real API key is still not configured. Real AI generation is not yet
activated.

- `src/app/api/lesson-plans/generate/route.ts` — a server-only Next.js API
  route implementing: form input → `buildLessonPlanPrompt` → generation
  service (mock or OpenAI) → `validateLessonPlanResponse` → typed
  `LessonPlan` JSON response. Not called by the current UI yet.
- `src/lib/ai/services/openai-lesson-plan-service.ts` — real
  `LessonPlanGenerationService` implementation using the official `openai`
  Node SDK's Responses API, requesting JSON-only output.
- `src/lib/ai/services/generation-service-factory.ts` — the single place
  that switches between the mock and OpenAI services, based on the
  `LESSON_PLAN_PROVIDER` environment variable. Defaults to `mock` when the
  variable is missing or unrecognized.
- `src/lib/ai/config.ts` — single source of truth for the OpenAI model name
  and request timeout; nothing else should hardcode either.
- `.env.example` documents the required variables (`LESSON_PLAN_PROVIDER`,
  `OPENAI_API_KEY`) with no real values. `.env.local` remains git-ignored.
- The Lesson Planner UI (`useLessonPlanGenerator`) was unchanged at the end
  of this sprint and still called the mock service directly. Superseded by
  Sprint 2.6 below.

### Sprint 2.6 — Connect Lesson Planner UI to Real API Route

Status: Complete. The Lesson Planner UI now calls
`/api/lesson-plans/generate` for every generation and regeneration.

- `src/lib/lesson-planner/lesson-plan-api-client.ts` — the only place the
  browser talks to the server about generation. Sends the raw
  `LessonPlanFormInput`, never a prompt; never knows whether the response
  came from the mock service or OpenAI.
- `src/hooks/use-lesson-plan-generator.ts` — `generate` now calls
  `generateLessonPlanViaApi` instead of building a prompt and invoking the
  mock service in-process. Staged loading messages are preserved via a
  fixed client-side timer (there's no way to get a real progress signal
  out of a single fetch/response cycle), with a 35s client-side abort as a
  backstop above the server's own 30s OpenAI timeout.
  Which provider actually answers is decided entirely server-side by
  `LESSON_PLAN_PROVIDER` — the client has no way to read that variable and
  never tries to.
- Error messages shown to the teacher come directly from the API route's
  existing safe Turkish error mapping (`getSafeLessonPlanErrorMessage`);
  the client only adds its own message for a client-side timeout/abort.
- The mock generation service is unchanged and still fully available —
  it's just invoked server-side, inside the API route, instead of directly
  from the client.

## Planned Sprints

- Sprint 3 — Quiz Generator
- Sprint 4 — Worksheet Generator
- Sprint 5 — Rubric Generator
- Sprint 6 — Presentation Builder
- Sprint 7 — Text Simplifier
- Sprint 8 — Documents
- Sprint 9 — Authentication and User Settings
- Sprint 10 — AI and Backend Integration

## Future Scope

- multilingual support
- institution accounts
- collaboration
- templates
- curriculum integrations
- analytics
- administrator tools
