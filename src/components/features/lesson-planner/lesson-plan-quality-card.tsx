import { CheckCircle2, Info, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getLessonPlanQualityMetrics } from "@/lib/lesson-planner/quality-heuristics";
import type { Dictionary } from "@/types/i18n";
import type { LessonPlan } from "@/types/lesson-planner";

interface LessonPlanQualityCardProps {
  t: Dictionary;
  plan: LessonPlan;
}

export function LessonPlanQualityCard({ t, plan }: LessonPlanQualityCardProps) {
  const copy = t.lessonPlanner.qualityCard;
  const metrics = getLessonPlanQualityMetrics(plan);

  return (
    <Card size="sm" className="ring-foreground/8">
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {metrics.map((metric) => {
            const metricCopy = copy.metrics[metric.id];
            const isGood = metric.status === "good";
            return (
              <div
                key={metric.id}
                className="flex flex-1 items-start gap-2 rounded-lg bg-muted/40 px-2.5 py-2"
              >
                {isGood ? (
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                ) : (
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                )}
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-foreground">{metricCopy.label}</span>
                  <Badge variant="outline" className="border-transparent px-0 text-xs font-normal text-muted-foreground">
                    {isGood ? metricCopy.good : metricCopy.attention}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {copy.placeholderNote}
        </div>
      </CardContent>
    </Card>
  );
}
