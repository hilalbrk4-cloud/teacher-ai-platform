import Link from "next/link";
import { ArrowRight, CheckCircle2, FileQuestion, FileText, Mail, Presentation, ScrollText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SectionTitle } from "@/components/shared/section-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatRelativeTime } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/config";
import { continueWorkingItems } from "@/lib/mock-data";
import type { DocumentKind, DocumentStatus } from "@/types/dashboard";

const KIND_ICONS: Record<DocumentKind, LucideIcon> = {
  "lesson-plan": FileText,
  quiz: FileQuestion,
  worksheet: ScrollText,
  rubric: FileText,
  slides: Presentation,
  letter: Mail,
};

const STATUS_STYLES: Record<DocumentStatus, string> = {
  draft: "border-border text-muted-foreground",
  "in-progress": "border-transparent bg-primary/10 text-primary",
  ready: "border-transparent bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
};

export function ContinueWorking() {
  const t = getDictionary();

  return (
    <section className="flex flex-col gap-4">
      <SectionTitle
        title={t.continueWorking.title}
        description={t.continueWorking.description}
        action={
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/documents" />}>
            {t.continueWorking.viewAll}
          </Button>
        }
      />
      <Card className="divide-y divide-border p-0">
        {continueWorkingItems.map((item) => {
          const Icon = KIND_ICONS[item.kind];

          return (
            <div
              key={item.id}
              className="group flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-muted/40"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-transform duration-200 group-hover:scale-105">
                <Icon className="size-4.5" aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                  <Badge variant="outline" className={STATUS_STYLES[item.status]}>
                    {t.continueWorking.statuses[item.status]}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {item.subject} &middot; {t.continueWorking.kinds[item.kind]} &middot;{" "}
                  {t.continueWorking.editedPrefix} {formatRelativeTime(item.updatedAt)}
                </p>

                {item.status === "ready" ? (
                  <p className="mt-2.5 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    {t.continueWorking.readyToUse}
                  </p>
                ) : (
                  <div className="mt-2.5 flex items-center gap-2">
                    <Progress
                      value={item.progress}
                      aria-label={`${item.title} — %${item.progress}`}
                      className="flex-1"
                    />
                    <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
                      %{item.progress}
                    </span>
                  </div>
                )}
              </div>

              <Button
                variant="secondary"
                size="sm"
                nativeButton={false}
                render={<Link href={`/documents/${item.id}`} />}
                className="shrink-0 gap-1"
              >
                {t.continueWorking.continueLabel}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
          );
        })}
      </Card>
    </section>
  );
}
