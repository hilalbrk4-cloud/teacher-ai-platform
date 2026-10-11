import { Landmark, Network } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { TYMM_SKILL_GROUP_ORDER } from "@/lib/lesson-planner/tymm-skills";
import type { LessonPlanCurriculumContext } from "@/types/curriculum";
import type { Dictionary } from "@/types/i18n";
import type { LessonPlanSkills } from "@/types/lesson-planner";

interface LessonPlanSkillsCardProps {
  t: Dictionary;
  skills: LessonPlanSkills;
  curriculum?: LessonPlanCurriculumContext;
}

/** "SDB2.2 İş Birliği" → kod ve etiket ayrı vurgulanır. */
function SkillBadge({ value }: { value: string }) {
  const match = /^((?:SDB|D|OB)\d+(?:\.\d+)?)\s+(.+)$/.exec(value);
  return (
    <Badge variant="outline" className="bg-card font-normal">
      {match ? (
        <>
          <span className="font-semibold text-primary">{match[1]}</span>
          {match[2]}
        </>
      ) : (
        value
      )}
    </Badge>
  );
}

/**
 * TYMM Beceriler Örgüsü: KB / SDB / Eğilim / Değer etiketleri. Plan resmî
 * müfredattan üretildiyse seçilen çıktı kodları ve Okuryazarlık becerileri
 * de (kodlarıyla, eksiksiz) gösterilir.
 */
export function LessonPlanSkillsCard({ t, skills, curriculum }: LessonPlanSkillsCardProps) {
  const copy = t.lessonPlanner.skills;
  const groups = TYMM_SKILL_GROUP_ORDER.filter((group) => skills[group].length > 0);
  const literacy = curriculum?.literacy ?? [];
  if (groups.length === 0 && !curriculum) return null;

  return (
    <section
      aria-labelledby="lesson-plan-skills-title"
      className="rounded-lg border border-border/70 bg-muted/30 p-3.5"
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Network className="size-3" aria-hidden="true" />
        </span>
        <div>
          <h3 id="lesson-plan-skills-title" className="text-sm font-semibold text-foreground">
            {copy.title}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{copy.description}</p>
        </div>
      </div>

      {curriculum ? (
        <div className="mt-3 rounded-md border border-primary/15 bg-card/80 p-2.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Landmark className="size-3 text-primary" aria-hidden="true" />
            {copy.officialOutcomes}
          </p>
          <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
            {curriculum.unit} › {curriculum.topic}
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {curriculum.outcomes.map((outcome) => (
              <li key={outcome.code} className="text-xs leading-snug text-foreground">
                <span className="mr-1.5 inline-block rounded bg-primary/10 px-1.5 py-px text-[0.68rem] font-semibold tabular-nums text-primary">
                  {outcome.code}
                </span>
                {outcome.text}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[0.68rem] text-muted-foreground">{copy.officialSource}</p>
        </div>
      ) : null}

      <dl className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {groups.map((group) => {
          const { short, label } = copy.groups[group];
          return (
            <div key={group} className="flex flex-col gap-1.5">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span className="rounded bg-primary/10 px-1 py-px text-[0.65rem] font-semibold tracking-wide text-primary">
                  {short}
                </span>
                {label}
              </dt>
              <dd className="flex flex-wrap gap-1">
                {skills[group].map((skill) => (
                  <SkillBadge key={skill} value={skill} />
                ))}
              </dd>
            </div>
          );
        })}
        {literacy.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span className="rounded bg-primary/10 px-1 py-px text-[0.65rem] font-semibold tracking-wide text-primary">
                {copy.literacy.short}
              </span>
              {copy.literacy.label}
            </dt>
            <dd className="flex flex-wrap gap-1">
              {literacy.map((tag) => (
                <SkillBadge key={tag.code} value={`${tag.code} ${tag.label}`} />
              ))}
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
