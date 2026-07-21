import { defaultLocale } from "@/lib/i18n/config";

const RELATIVE_UNITS: { limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { limit: 60, divisor: 1, unit: "seconds" },
  { limit: 3600, divisor: 60, unit: "minutes" },
  { limit: 86400, divisor: 3600, unit: "hours" },
  { limit: 604800, divisor: 86400, unit: "days" },
  { limit: 2629800, divisor: 604800, unit: "weeks" },
];

export function formatRelativeTime(isoDate: string, now: Date = new Date()): string {
  const diffSeconds = (new Date(isoDate).getTime() - now.getTime()) / 1000;
  const absSeconds = Math.abs(diffSeconds);

  const match = RELATIVE_UNITS.find((entry) => absSeconds < entry.limit);
  if (!match) {
    return new Intl.DateTimeFormat(defaultLocale, { month: "short", day: "numeric" }).format(
      new Date(isoDate)
    );
  }

  const relativeFormatter = new Intl.RelativeTimeFormat(defaultLocale, { numeric: "auto" });
  return relativeFormatter.format(Math.round(diffSeconds / match.divisor), match.unit);
}
