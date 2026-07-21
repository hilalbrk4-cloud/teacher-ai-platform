import * as React from "react";

import { cn } from "@/lib/utils";

interface SectionTitleProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionTitle({ title, description, action, className }: SectionTitleProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div>
        <h2 className="text-[0.95rem] font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed font-normal text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
