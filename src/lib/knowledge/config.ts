/**
 * Server-only. Controls whether `draft`/`needsReview` Knowledge Packs may be
 * used for preview purposes anywhere in the app. This is a development/test
 * aid only — a draft pack has not passed the active-governance gate, so its
 * content must never be presented to a teacher as verified.
 *
 * Draft preview is structurally impossible in production: even if
 * `KNOWLEDGE_PACK_DRAFT_PREVIEW` is mistakenly set to "true" in a production
 * environment, this still returns `false` there. It is not merely a
 * default — production can never enable it.
 */
export function isDraftPreviewEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.KNOWLEDGE_PACK_DRAFT_PREVIEW?.trim().toLowerCase() === "true";
}
