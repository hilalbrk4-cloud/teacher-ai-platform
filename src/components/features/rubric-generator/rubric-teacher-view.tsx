import { Landmark } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/types/i18n";
import { RUBRIC_SCALE_LEVELS, type Rubric } from "@/types/rubric";

interface RubricTeacherViewProps {
  t: Dictionary;
  rubric: Rubric;
}

/** "FB.7.5.1", "SDB2.2", "D16", "OB7": tür rengini kodun önekinden alır. */
function codeTone(code: string): string {
  if (code.startsWith("SDB")) return "border-primary/25 bg-primary/5 text-primary";
  if (/^D\d/.test(code)) return "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400";
  if (code.startsWith("OB")) return "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400";
  return "border-foreground/15 bg-foreground/[0.04] text-foreground";
}

function CodeBadges({ codes }: { codes: string[] }) {
  if (codes.length === 0) return null;
  return (
    <span className="mt-1.5 flex flex-wrap gap-1">
      {codes.map((code) => (
        <Badge key={code} variant="outline" className={cn("h-4 px-1.5 text-[0.62rem] font-semibold tabular-nums", codeTone(code))}>
          {code}
        </Badge>
      ))}
    </span>
  );
}

/**
 * Öğretmen görünümü (resmî MEB formatı): TYMM kod özeti, puan ağırlıkları
 * ve seviye tanımları. Masaüstünde tablo, dar ekranda kriter kartları.
 */
export function RubricTeacherView({ t, rubric }: RubricTeacherViewProps) {
  const copy = t.rubricGenerator.preview;
  const levels = RUBRIC_SCALE_LEVELS[rubric.scale];
  /** Seviyeler yüksekten düşüğe gösterilir (MEB örneklerindeki gibi). */
  const order = levels.map((_, index) => levels.length - 1 - index);
  const curriculum = rubric.curriculum;
  const conceptual = [...new Set(rubric.criteria.flatMap((criterion) => criterion.conceptualSkills))];
  const isHolistic = rubric.rubricType === "butuncul";
  /** Havuzdaki kodlardan kriterlere gerçekten bağlananlar vurgulanır, kalanlar soluk gösterilir. */
  const usedCodes = new Set(rubric.criteria.flatMap((criterion) => criterion.skillCodes));

  return (
    // Tablo/kart geçişi görünüm alanına değil panelin kendi genişliğine göre yapılır (container query).
    <div className="@container flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-foreground">{rubric.teacherTaskSummary}</p>

      <section aria-label={copy.officialSkillsTitle} className="rounded-lg border border-border/70 bg-muted/30 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Landmark className="size-3.5 text-primary" aria-hidden="true" />
          {copy.officialSkillsTitle}
        </p>
        {curriculum ? (
          <div className="mt-2 flex flex-col gap-2">
            <ul className="flex flex-col gap-1">
              {curriculum.outcomes.map((outcome) => (
                <li key={outcome.code} className="text-xs leading-snug text-foreground">
                  <span className="mr-1.5 inline-block rounded bg-primary/10 px-1.5 py-px text-[0.65rem] font-semibold tabular-nums text-primary">
                    {outcome.code}
                  </span>
                  {outcome.text}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-1">
              {[...curriculum.sdb, ...curriculum.values, ...curriculum.literacy].map((tag) => (
                <Badge
                  key={tag.code}
                  variant="outline"
                  className={cn("font-normal", codeTone(tag.code), !usedCodes.has(tag.code) && "opacity-45")}
                >
                  <span className="font-semibold">{tag.code}</span>
                  {tag.label}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">{copy.noCodesNote}</p>
        )}
        {conceptual.length > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{copy.conceptualSkills}:</span> {conceptual.join(", ")}
          </p>
        ) : null}
      </section>

      {isHolistic ? (
        <>
          <section aria-label={copy.holisticTitle} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground">{copy.holisticTitle}</h3>
            {order.map((index) => {
              const level = rubric.holisticLevels[index];
              return (
                <div key={levels[index].id} className="flex flex-col gap-1 rounded-lg border border-border/70 bg-card p-3 sm:flex-row sm:gap-3">
                  <div className="shrink-0 sm:w-36">
                    <p className="text-sm font-semibold text-foreground">{t.rubricGenerator.levels[levels[index].id]}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">{copy.levelRange(level.range.min, level.range.max)}</p>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">{level.teacher}</p>
                </div>
              );
            })}
          </section>
          <section aria-label={copy.holisticCriteriaTitle} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground">{copy.holisticCriteriaTitle}</h3>
            <ol className="flex flex-col gap-2">
              {rubric.criteria.map((criterion, index) => (
                <li key={criterion.id} className="rounded-lg border border-border/70 bg-card p-3 text-sm">
                  <p className="font-semibold text-foreground">
                    {index + 1}. {criterion.teacherCriterion.title}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">{criterion.teacherCriterion.description}</p>
                  <CodeBadges codes={criterion.skillCodes} />
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : (
        <>
          {/* Masaüstü / tablet: resmî tablo */}
          <div className="hidden overflow-hidden rounded-lg border border-border @lg:block">
            <table lang="tr" className="w-full table-fixed border-collapse text-left text-xs">
              <colgroup>
                <col className="w-[27%]" />
                {order.map((index) => (
                  <col key={index} />
                ))}
              </colgroup>
              <thead className="bg-muted/60">
                <tr>
                  <th scope="col" className="border-b border-border px-2.5 py-2 font-semibold text-foreground">
                    {copy.criterion} · {copy.weight}
                  </th>
                  {order.map((index) => (
                    <th
                      key={index}
                      scope="col"
                      className="border-b border-l border-border px-1.5 py-2 text-center font-semibold break-words hyphens-auto text-foreground"
                    >
                      {t.rubricGenerator.levels[levels[index].id]}
                      <span className="block text-[0.65rem] font-normal text-muted-foreground">({index + 1})</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rubric.criteria.map((criterion, number) => (
                  <tr key={criterion.id} className="align-top even:bg-muted/20">
                    <th scope="row" className="border-b border-border px-2.5 py-2 font-normal">
                      <span className="flex items-start justify-between gap-1.5">
                        <span className="text-[0.8rem] font-semibold text-foreground">
                          {number + 1}. {criterion.teacherCriterion.title}
                        </span>
                        <Badge variant="secondary" className="shrink-0 tabular-nums">
                          {criterion.weight}
                        </Badge>
                      </span>
                      <span className="mt-0.5 block leading-snug text-muted-foreground">{criterion.teacherCriterion.description}</span>
                      <CodeBadges codes={criterion.skillCodes} />
                    </th>
                    {order.map((index) => (
                      <td key={index} className="border-b border-l border-border px-2 py-2 leading-snug break-words hyphens-auto text-foreground">
                        {criterion.teacherCriterion.levels[index]}
                        <span className="mt-1 block text-right text-[0.65rem] font-semibold tabular-nums text-primary">
                          {copy.points(criterion.levelPoints[index])}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/60">
                <tr>
                  <th scope="row" className="px-2.5 py-2 text-right font-semibold text-foreground">
                    {copy.total}: <span className="tabular-nums">100</span>
                  </th>
                  <td colSpan={order.length} className="border-l border-border" />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Telefon: kriter kartları */}
          <ol className="flex flex-col gap-3 @lg:hidden">
            {rubric.criteria.map((criterion, number) => (
              <li key={criterion.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {number + 1}. {criterion.teacherCriterion.title}
                  </p>
                  <Badge variant="secondary" className="shrink-0 tabular-nums">
                    {copy.points(criterion.weight)}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{criterion.teacherCriterion.description}</p>
                <CodeBadges codes={criterion.skillCodes} />
                <dl className="mt-2.5 flex flex-col gap-1.5">
                  {order.map((index) => (
                    <div key={index} className="rounded-md bg-muted/40 px-2.5 py-1.5">
                      <dt className="flex justify-between text-[0.7rem] font-semibold text-foreground">
                        {t.rubricGenerator.levels[levels[index].id]}
                        <span className="tabular-nums text-primary">{copy.points(criterion.levelPoints[index])}</span>
                      </dt>
                      <dd className="mt-0.5 text-xs leading-snug text-foreground">{criterion.teacherCriterion.levels[index]}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
