import { SectionTitle } from "@/components/shared/section-title";
import { Card } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/config";
import { recentActivity } from "@/lib/mock-data";

export function RecentActivity() {
  const t = getDictionary();

  return (
    <section className="flex flex-col gap-4">
      <SectionTitle title={t.recentActivity.title} description={t.recentActivity.description} />
      <Card className="gap-0 divide-y divide-border p-0">
        {recentActivity.map((activity) => {
          const Icon = activity.icon;
          return (
            <div
              key={activity.id}
              className="group flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-muted/40"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-transform duration-200 group-hover:scale-105">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{activity.description}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatRelativeTime(activity.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
      </Card>
    </section>
  );
}
