/**
 * Deterministic identifier normalization used for slug/alias collision
 * detection and for resolving a `slugOrAlias` query. This is exact-match
 * after normalization only — casefolding, trimming, and whitespace/hyphen
 * collapsing. It never strips Turkish letters (ş, ğ, ü, ö, ç, ı are distinct
 * letters, not accents) and never performs fuzzy/similarity matching.
 */
export function normalizeIdentifier(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .trim()
    .replace(/[\s-]+/g, "-");
}
