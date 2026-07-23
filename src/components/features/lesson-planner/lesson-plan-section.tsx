"use client";

import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type LessonPlanSectionState = "outline" | "loading" | "result";

interface LessonPlanSectionBlockProps {
  title: string;
  index?: number;
  content?: string;
  state: LessonPlanSectionState;
  editable?: boolean;
  pendingText?: string;
  onChange?: (value: string) => void;
  onCopy?: () => void;
  copyLabel?: string;
  className?: string;
}

export function LessonPlanSectionBlock({
  title,
  index,
  content,
  state,
  editable = false,
  pendingText,
  onChange,
  onCopy,
  copyLabel,
  className,
}: LessonPlanSectionBlockProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/70 bg-card/60 p-3.5 transition-colors",
        state === "result" && "bg-card ring-1 ring-foreground/5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {index ? (
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-semibold tabular-nums",
                state === "result" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}
              aria-hidden="true"
            >
              {index}
            </span>
          ) : null}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {state === "result" && onCopy ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={copyLabel}
            onClick={onCopy}
            className="shrink-0 text-muted-foreground"
          >
            <Copy className="size-3.5" aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      {state === "outline" ? <p className="mt-2 text-xs text-muted-foreground">{pendingText}</p> : null}

      {state === "loading" ? (
        <div className="mt-3 flex flex-col gap-1.5" aria-hidden="true">
          <div className="h-2.5 w-full animate-pulse rounded-full bg-muted" />
          <div className="h-2.5 w-4/5 animate-pulse rounded-full bg-muted" />
          <div className="h-2.5 w-3/5 animate-pulse rounded-full bg-muted" />
        </div>
      ) : null}

      {state === "result" ? (
        editable ? (
          <Textarea
            value={content}
            onChange={(event) => onChange?.(event.target.value)}
            rows={4}
            aria-label={title}
            className="mt-2 min-h-24 resize-y border-transparent bg-transparent px-0 py-0 text-sm leading-relaxed shadow-none focus-visible:border-ring focus-visible:bg-background focus-visible:px-2.5 focus-visible:py-1.5 focus-visible:ring-3"
          />
        ) : (
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">{content}</p>
        )
      ) : null}
    </div>
  );
}
