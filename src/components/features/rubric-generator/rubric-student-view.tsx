"use client";

import * as React from "react";
import { Check, Lightbulb } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Dictionary } from "@/types/i18n";
import type { Rubric } from "@/types/rubric";

interface RubricStudentViewProps {
  t: Dictionary;
  rubric: Rubric;
}

function CheckBox({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        checked ? "border-emerald-600 bg-emerald-600 text-white" : "border-foreground/30 bg-background hover:border-foreground/50"
      )}
    >
      {checked ? <Check className="size-4" aria-hidden="true" /> : null}
    </button>
  );
}

/**
 * Öğrenci dostu kontrol kartı: sen diliyle sorular, ipuçları ve kutucuklar.
 * Öz/akran rubriğinde "Ben" ve "Akranım" sütunları; bütüncül rubrikte
 * öğrencinin kendi düzeyini işaretleyeceği seçenekler. Kutucuklar ekranda
 * denenebilir; asıl kullanım Word öğrenci kâğıdıdır.
 */
export function RubricStudentView({ t, rubric }: RubricStudentViewProps) {
  const copy = t.rubricGenerator.preview;
  const isPeer = rubric.rubricType === "akranOz";
  const columns = isPeer ? [copy.checkSelf, copy.checkPeer] : [copy.checkDone];
  const [checked, setChecked] = React.useState<Record<string, boolean>>({});
  const toggle = (key: string) => setChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">{copy.studentViewNote}</p>
      <article className="rounded-xl border-2 border-dashed border-primary/25 bg-card p-4 sm:p-5">
        <header className="text-center">
          <h3 className="text-base font-bold tracking-tight text-foreground">{isPeer ? copy.peerFormTitle : copy.studentFormTitle}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {rubric.subject} · {rubric.gradeLevel} · {rubric.topic}
          </p>
        </header>
        <p className="mt-3 border-b border-dotted border-border pb-2 text-xs text-muted-foreground">{copy.studentNameLine}</p>
        <div className="mt-3 rounded-lg bg-primary/[0.05] px-3 py-2">
          <p className="text-sm font-semibold text-foreground">
            {copy.myTask}: {rubric.taskTitle}
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-foreground/85">{rubric.studentTaskSummary}</p>
        </div>

        <div className="mt-3 flex items-end justify-end gap-2 pr-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
          {columns.map((column) => (
            <span key={column} className="w-10 text-center">
              {column}
            </span>
          ))}
        </div>
        <ol className="flex flex-col divide-y divide-border">
          {rubric.criteria.map((criterion, index) => (
            <li key={criterion.id} className="flex items-start gap-3 py-2.5">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.95rem] font-semibold leading-snug text-foreground">{criterion.studentFriendlyCriterion.question}</p>
                <p className="mt-0.5 flex items-start gap-1 text-xs leading-snug text-muted-foreground">
                  <Lightbulb className="mt-px size-3 shrink-0 text-amber-500" aria-hidden="true" />
                  <span>
                    <span className="sr-only">{copy.hint}: </span>
                    {criterion.studentFriendlyCriterion.hint}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {columns.map((column) => {
                  const key = `${criterion.id}-${column}`;
                  return (
                    <span key={column} className="flex w-10 justify-center">
                      <CheckBox
                        checked={Boolean(checked[key])}
                        label={`${criterion.studentFriendlyCriterion.question} — ${column}`}
                        onToggle={() => toggle(key)}
                      />
                    </span>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>

        {rubric.rubricType === "butuncul" && rubric.holisticLevels.length > 0 ? (
          <fieldset className="mt-3 rounded-lg bg-muted/40 p-3">
            <legend className="px-1 text-sm font-semibold text-foreground">{copy.holisticSelfTitle}</legend>
            <ul className="flex flex-col gap-1.5">
              {[...rubric.holisticLevels].reverse().map((level, index) => {
                const key = `holistic-${index}`;
                return (
                  <li key={key} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckBox checked={Boolean(checked[key])} label={level.student} onToggle={() => toggle(key)} />
                    <span className="pt-0.5 leading-snug">{level.student}</span>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ) : null}

        <div className="mt-4 flex flex-col gap-2.5 text-sm text-foreground">
          <p>
            {copy.reflectionNext} <span className="inline-block w-full border-b border-dotted border-foreground/30 sm:w-auto sm:min-w-56">&nbsp;</span>
          </p>
          {isPeer ? (
            <>
              <p>
                {copy.peerName} <span className="inline-block min-w-40 border-b border-dotted border-foreground/30">&nbsp;</span>
              </p>
              <p>
                {copy.peerAdvice} <span className="inline-block w-full border-b border-dotted border-foreground/30 sm:w-auto sm:min-w-56">&nbsp;</span>
              </p>
            </>
          ) : null}
        </div>
      </article>
    </div>
  );
}
