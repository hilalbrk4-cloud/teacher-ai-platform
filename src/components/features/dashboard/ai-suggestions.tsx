import { ArrowRight } from "lucide-react";

import { SectionTitle } from "@/components/shared/section-title";
import { Card } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n/config";
import { aiSuggestions } from "@/lib/mock-data";

export function AiSuggestions() {
  const t = getDictionary();

  return (
    <section className="flex flex-col gap-4">
      <SectionTitle title={t.aiSuggestions.title} description={t.aiSuggestions.description} />
      <Card className="gap-0 divide-y divide-border p-0">
        {aiSuggestions.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <button
              key={suggestion.id}
              type="button"
              className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-muted/40"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition-transform duration-200 group-hover:scale-105">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{suggestion.title}</p>
              <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors duration-150 group-hover:text-primary">
                <span className="hidden sm:inline">{suggestion.ctaLabel}</span>
                <ArrowRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </button>
          );
        })}
      </Card>
    </section>
  );
}
