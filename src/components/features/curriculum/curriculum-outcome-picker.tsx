"use client";

import * as React from "react";
import { Check, Landmark } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { outcomeGroupLabel } from "@/lib/curriculum/catalog";
import { cn } from "@/lib/utils";
import type { CurriculumGradeData, CurriculumOutcome, CurriculumTag, CurriculumTopic, CurriculumUnit } from "@/types/curriculum";
import type { Dictionary } from "@/types/i18n";

interface CurriculumOutcomePickerProps {
  t: Dictionary;
  grade: CurriculumGradeData;
  unit: CurriculumUnit;
  topic: CurriculumTopic;
  selectedCodes: string[];
  onToggle: (outcome: CurriculumOutcome) => void;
  onSetAll: (outcomes: CurriculumOutcome[]) => void;
  /** Modüle özgü metinler (ör. Rubrik: "Kriter havuzuna otomatik bağlanacak"). */
  description?: string;
  autoIncludedTitle?: string;
}

function mergeTags(lists: CurriculumTag[][]): CurriculumTag[] {
  const seen = new Map<string, CurriculumTag>();
  for (const tag of lists.flat()) if (!seen.has(tag.code)) seen.set(tag.code, tag);
  return [...seen.values()].sort((a, b) => a.code.localeCompare(b.code, "tr", { numeric: true }));
}

const TAG_STYLES = {
  sdb: "border-primary/25 bg-primary/5 text-primary",
  values: "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
  literacy: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
} as const;

/**
 * Seçili konunun resmî öğrenme çıktıları: işaretlenebilir liste, beceri
 * alanına göre gruplar (Türkçe/İngilizce) ve seçime göre plana otomatik
 * eklenecek SDB / Değer / Okuryazarlık özetleri.
 */
export function CurriculumOutcomePicker({
  t,
  grade,
  unit,
  topic,
  selectedCodes,
  onToggle,
  onSetAll,
  description,
  autoIncludedTitle,
}: CurriculumOutcomePickerProps) {
  const copy = t.curriculum;
  const outcomes = React.useMemo(
    () => topic.outcomeCodes.map((code) => grade.outcomes[code]).filter(Boolean),
    [grade, topic]
  );
  const selected = outcomes.filter((outcome) => selectedCodes.includes(outcome.code));
  const groups = React.useMemo(() => {
    const byLabel = new Map<string, CurriculumOutcome[]>();
    for (const outcome of outcomes) {
      const label = outcomeGroupLabel(outcome.code) ?? "";
      byLabel.set(label, [...(byLabel.get(label) ?? []), outcome]);
    }
    return [...byLabel.entries()];
  }, [outcomes]);

  const included = [
    { kind: "sdb" as const, tags: mergeTags(selected.map((outcome) => outcome.sdb)) },
    { kind: "values" as const, tags: mergeTags(selected.map((outcome) => outcome.values)) },
    { kind: "literacy" as const, tags: mergeTags(selected.map((outcome) => outcome.literacy)) },
  ].filter((group) => group.tags.length > 0);

  const titleId = "lp-official-outcomes-title";

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-xl border border-primary/15 bg-primary/[0.03] p-3.5 animate-in fade-in-0 slide-in-from-top-1 duration-200"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Landmark className="size-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 id={titleId} className="text-sm font-semibold text-foreground">
              {grade.program === "tymm" ? copy.officialTitleTymm : copy.officialTitlePrevious}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {unit.name} › {topic.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="tabular-nums" aria-live="polite">
            {copy.selectedCount(selected.length)}
          </Badge>
          {selected.length < outcomes.length ? (
            <Button type="button" variant="ghost" size="xs" onClick={() => onSetAll(outcomes)}>
              {copy.selectAll}
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="xs" onClick={() => onSetAll([])}>
              {copy.clearAll}
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{description ?? copy.officialDescription}</p>

      <div className="flex max-h-80 flex-col gap-2.5 overflow-y-auto pr-0.5">
        {groups.map(([label, items]) => (
          <div key={label || "all"} role="group" aria-label={label || undefined} className="flex flex-col gap-1.5">
            {label ? (
              <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            ) : null}
            {items.map((outcome) => {
              const isSelected = selectedCodes.includes(outcome.code);
              return (
                <button
                  key={outcome.code}
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  onClick={() => onToggle(outcome)}
                  className={cn(
                    "group flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    isSelected
                      ? "border-primary/40 bg-card shadow-sm ring-1 ring-primary/15"
                      : "border-border/70 bg-card/70 hover:border-primary/30 hover:bg-card"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                      isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"
                    )}
                    aria-hidden="true"
                  >
                    {isSelected ? <Check className="size-3" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="mr-1.5 inline-block rounded bg-primary/10 px-1.5 py-px align-[1px] text-[0.68rem] font-semibold tabular-nums text-primary">
                      {outcome.code}
                    </span>
                    <span className="text-[0.8rem] leading-snug text-foreground">{outcome.text}</span>
                    {outcome.components.length > 0 ? (
                      <span className="mt-0.5 block text-[0.7rem] text-muted-foreground">
                        {copy.componentsCount(outcome.components.length)}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-primary/10 pt-2.5">
        <p className="text-xs font-medium text-foreground">{autoIncludedTitle ?? copy.autoIncludedTitle}</p>
        {included.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {included.flatMap(({ kind, tags }) =>
              tags.map((tag) => (
                <Badge key={tag.code} variant="outline" className={cn("font-normal", TAG_STYLES[kind])}>
                  <span className="font-semibold">{tag.code}</span>
                  {tag.label}
                </Badge>
              ))
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{copy.autoIncludedEmpty}</p>
        )}
        <p className="text-[0.68rem] text-muted-foreground/80">{copy.sourceNote}</p>
      </div>
    </section>
  );
}
