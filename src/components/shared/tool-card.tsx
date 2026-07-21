import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { FavoriteToggleButton } from "@/components/shared/favorite-toggle-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import type { AiTool } from "@/types/dashboard";

const ACCENT_STYLES: Record<AiTool["accent"], string> = {
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
};

interface ToolCardProps {
  tool: AiTool;
}

export function ToolCard({ tool }: ToolCardProps) {
  const t = getDictionary();
  const Icon = tool.icon;
  const copy = t.quickTools.tools[tool.id];

  return (
    <Card className="group h-full gap-3 p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/[0.04] hover:ring-primary/25">
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-lg transition-transform duration-200 ease-out group-hover:scale-110",
            ACCENT_STYLES[tool.accent]
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <FavoriteToggleButton label={copy.title} defaultFavorite={tool.favorite} />
      </div>

      <div className="flex-1">
        <h3 className="text-sm font-semibold text-foreground">{copy.title}</h3>
        <p className="mt-1 text-sm leading-snug text-muted-foreground">{copy.description}</p>
      </div>

      <Button
        variant="secondary"
        size="sm"
        nativeButton={false}
        render={<Link href={tool.href} />}
        className="w-full justify-between"
      >
        {t.quickTools.quickStart}
        <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
      </Button>
    </Card>
  );
}
