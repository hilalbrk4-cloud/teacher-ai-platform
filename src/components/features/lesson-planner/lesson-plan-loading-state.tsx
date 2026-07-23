import { Loader2 } from "lucide-react";

import { Progress } from "@/components/ui/progress";

interface LessonPlanLoadingStateProps {
  message: string;
  stage: number;
  totalStages: number;
}

export function LessonPlanLoadingState({ message, stage, totalStages }: LessonPlanLoadingStateProps) {
  const value = Math.min(100, Math.round(((stage + 1) / totalStages) * 100));

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center animate-in fade-in-0 duration-300">
      <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
      <p
        key={stage}
        className="text-sm font-medium text-foreground animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
        role="status"
        aria-live="polite"
      >
        {message}
      </p>
      <Progress value={value} className="w-full max-w-xs" aria-label={message} />
    </div>
  );
}
