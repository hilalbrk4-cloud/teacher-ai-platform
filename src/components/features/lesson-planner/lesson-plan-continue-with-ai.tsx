import { SendHorizonal, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { Dictionary } from "@/types/i18n";

interface LessonPlanContinueWithAiProps {
  t: Dictionary;
}

export function LessonPlanContinueWithAi({ t }: LessonPlanContinueWithAiProps) {
  const copy = t.lessonPlanner.continueWithAi;

  return (
    <Card size="sm" className="ring-foreground/8">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-3.5" aria-hidden="true" />
          </span>
          <CardTitle>{copy.title}</CardTitle>
          <Badge variant="outline" className="ml-auto">
            {copy.comingSoonBadge}
          </Badge>
        </div>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        <Textarea placeholder={copy.placeholder} disabled className="min-h-16 resize-none" />
        <Button type="button" variant="outline" size="sm" disabled aria-disabled="true" className="self-end">
          <SendHorizonal className="size-3.5" aria-hidden="true" />
          {copy.buttonLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
