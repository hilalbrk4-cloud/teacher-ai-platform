const MATH_SUBJECT_KEYWORDS = ["matematik", "math"];
const SCIENCE_SUBJECT_KEYWORDS = ["fen", "science", "biyoloji", "kimya", "fizik"];
const FRACTION_KEYWORDS = ["kesir", "fraction"];

function includesKeyword(text: string, keywords: string[]): boolean {
  const normalized = text.trim().toLocaleLowerCase("tr-TR");
  return keywords.some((keyword) => normalized.includes(keyword));
}

export function isMathSubject(subject: string): boolean {
  return includesKeyword(subject, MATH_SUBJECT_KEYWORDS);
}

export function isScienceSubject(subject: string): boolean {
  return includesKeyword(subject, SCIENCE_SUBJECT_KEYWORDS);
}

/** True when the topic or any learning outcome is about fractions ("Kesirler", "kesir türlerini ayırt eder"…). */
export function isFractionTopic(subject: string, texts: string[]): boolean {
  return isMathSubject(subject) && texts.some((text) => includesKeyword(text, FRACTION_KEYWORDS));
}
