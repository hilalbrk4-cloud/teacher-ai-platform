import Link from "next/link";

import { SectionTitle } from "@/components/shared/section-title";
import { ToolCard } from "@/components/shared/tool-card";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n/config";
import { quickAiTools } from "@/lib/mock-data";

export function QuickAiTools() {
  const t = getDictionary();

  return (
    <section className="flex flex-col gap-4">
      <SectionTitle
        title={t.quickTools.title}
        description={t.quickTools.description}
        action={
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/ai-tools" />}>
            {t.quickTools.seeAll}
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {quickAiTools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </section>
  );
}
