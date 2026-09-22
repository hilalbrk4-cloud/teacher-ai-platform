# Subject Knowledge Pack Infrastructure

Status: infrastructure implemented (v1.1). No Prompt Builder, UI, or API route
consumes it yet, and no production Mathematics/Science content exists — only
the reusable plumbing plus one test-only example pack.

## Purpose

A Knowledge Pack is structured pedagogical knowledge for one subject+grade+
topic — not a prompt, not AI output. It is meant to ground the Quiz
Generator, Lesson Planner, and future AI Teacher Reviewer in the same
verified facts, so they never drift apart.

## Where things live

```
src/types/knowledge-pack.ts                        types + resolution/diagnostics contracts
src/lib/knowledge/schema/knowledge-pack-schema.ts   structural validation (shape)
src/lib/knowledge/schema/knowledge-pack-semantic.ts semantic validation (business rules)
src/lib/knowledge/registry/normalize-identifier.ts  deterministic slug/alias normalization
src/lib/knowledge/registry/knowledge-pack-registry.ts  registry: resolve() + diagnostics
src/lib/knowledge/projections/knowledge-pack-projections.ts  per-feature projections
src/lib/knowledge/__fixtures__/                     test-only example packs (not production content)
```

Packs are plain JSON, validated by TypeScript at load time — content can be
authored/reviewed independently of an app deploy.

## Versioning model

- `id` is the permanent topic identity (e.g. `matematik.6.kesirler`) and never changes across revisions.
- `contentVersion` is a SemVer content revision (`MAJOR.MINOR.PATCH`).
- Uniqueness is the pair `(id, contentVersion)`, not `id` alone — a topic keeps its full version history.
- Exactly one `active` version may exist per `id` at a time. More than one is a registry consistency error (`multipleActiveVersions`), not a crash.
- A `deprecated`/`archived` version coexisting with an `active` one for the same `id` is normal and never flagged.

## Conflict priority policy

This governs how a future Prompt Builder must merge inputs once it's wired to a pack. Not yet enforced in code — no Prompt Builder is modified in this sprint — but recorded here so it isn't re-litigated:

1. System safety/correctness rules (`forbiddenPatterns`, `criticalReviewRules`)
2. Verified active Knowledge Pack facts (`learningOutcomes`, `keyConcepts`, `commonMisconceptions`, `assessableSkills`)
3. Selected Blueprint / learning outcome (existing `QuizBlueprint` slot data)
4. Teacher format/preference inputs (length, question type, difficulty, context) — honored only *within* the boundaries set by tiers 1–3
5. Model-generated choices

A teacher preference that would contradict a `forbiddenPattern`, a `criticalReviewRule`, a verified fact, or a targeted learning outcome must not be applied as given — the consuming feature resolves the conflict on the format side, never by silently overriding the pedagogical fact.

## Validation — three separated layers

1. **Structural** (`parseKnowledgePack`) — shape, types, and most enum membership. Does not check emptiness of governance-critical arrays, and deliberately leaves `questionPatterns[].suitableCognitiveLevels/suitableApproaches/suitableQuestionTypes/recommendedVisuals` as untyped string arrays — their domain membership is a semantic concern.
   `extractPackIdentity` is a separate, lenient pass that salvages just `id`/`slug`/`subject`/`gradeLevel` (+ `aliases`/`contentVersion`/`status` if present) even from an otherwise broken document.
2. **Semantic** (`validateKnowledgePackSemantics`) — non-empty required content (`keyConcepts`, `commonMisconceptions`, `difficultyRules.allowedLevels`), question-pattern domain membership and misconception cross-references, SemVer/ISO-8601 format checks, non-draft packs requiring a changelog entry, and the active-governance gate (below). Single-pack only — no cross-pack knowledge.
3. **Registry/runtime resolution** (`createKnowledgePackRegistry`) — cross-pack consistency (duplicate slugs/aliases, alias/slug collisions, duplicate `(id, contentVersion)`, multiple active versions, all after deterministic normalization) plus the actual `resolve()` lookup. Computed once at construction; `resolve()` never re-validates and never throws.

## Active-pack governance gate

A pack with `status: "active"` must additionally have: `verificationStatus: "verified"`, at least one entry in `sources`, `reviewedBy`, `lastReviewedAt`, at least one `changelog` entry, at least one `learningOutcomes`, `assessableSkills`, `questionPatterns`, and `criticalReviewRules` entry. `draft`/`deprecated`/`archived` packs are exempt (a draft is allowed to be a work in progress).

## Resolution contract

`registry.resolve({ subject, gradeLevel, slugOrAlias })` always returns one of:

| status      | meaning                                                              |
|-------------|-----------------------------------------------------------------------|
| `resolved`  | exactly one valid, active pack matched — safe to use                  |
| `notFound`  | no pack (valid or otherwise) matches                                  |
| `invalid`   | identity matched, but the pack's content is structurally/semantically broken |
| `inactive`  | identity matched a valid pack that isn't `active` (draft/deprecated/archived) |
| `ambiguous` | the identifier is unsafe to resolve alone (alias/slug collision across topics, or the matched topic has multiple active versions) |

Only `"resolved"` may be forwarded to a Prompt Builder or Reviewer. Every other status is a signal for the caller to fall back to the no-pack path — a broken or ambiguous pack can never break a teacher's request.

## Registry diagnostics

Separate from `resolve()`, `registry.getDiagnostics()` returns the full audit trail:

- `excluded` — every pack that isn't a clean, valid pack, tagged `identityUnrecoverable` (invisible to any query), `structuralInvalid`, or `semanticInvalid` (both still indexed by their salvaged identity, reachable via `resolve()` as `"invalid"`).
- `consistencyIssues` — every cross-pack collision detected: `duplicateSlugInSubjectGrade`, `duplicateAlias`, `aliasSlugCollision`, `duplicateIdContentVersion`, `multipleActiveVersions`.

## Topic resolution

Lookup is deterministic only: exact `subject` + `gradeLevel` + normalized `slug` or an approved `alias`. Normalization (`normalizeIdentifier`) is Turkish-aware casefolding + trim + whitespace/hyphen collapsing — never diacritic stripping and never fuzzy/similarity matching. There is no AI-based topic resolution in this version.

## Feature projections

`resolve()` returns the full `KnowledgePack`, but no feature should send that whole object into a prompt. Three narrow, typed projections keep prompts token-efficient by construction (unused fields don't exist on the return type, not just filtered at runtime):

- `projectPackForQuizGenerator` — outcomes, assessable skills, question patterns, difficulty rules, misconceptions, forbidden patterns.
- `projectPackForLessonPlanner` — outcomes, prerequisites, key concepts, teaching approaches, real-world connections, differentiation, vocabulary. No question-design fields.
- `projectPackForTeacherReviewer` — outcomes, assessable skills, misconceptions, forbidden patterns, critical review rules, curriculum alignment, vocabulary. No raw `sources`/`changelog`.

## Explicitly out of scope this sprint

No changes to the Quiz Generator, Lesson Planner, their Prompt Builders, the AI Teacher Reviewer (doesn't exist yet), UI, API routes, `QuizBlueprint`/Blueprint types, or generation services. No production Mathematics/Science content — `src/lib/knowledge/__fixtures__/` holds test-only example packs, never real curriculum content.
