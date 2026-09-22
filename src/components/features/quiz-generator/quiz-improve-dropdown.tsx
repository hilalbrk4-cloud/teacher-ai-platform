"use client";

import { ChevronDown, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Dictionary } from "@/types/i18n";

interface QuizImproveDropdownProps {
  t: Dictionary;
  disabled: boolean;
}

/**
 * All actions here are placeholders for the future AI Improve pipeline
 * (see docs/features.md: Make Easier, Make Harder, Convert to New
 * Generation, etc.) — disabled with a "coming soon" badge, same pattern as
 * the Lesson Planner's disabled Word/PDF export buttons. No AI Improve
 * backend exists yet.
 */
export function QuizImproveDropdown({ t, disabled }: QuizImproveDropdownProps) {
  const improve = t.quizGenerator.result.improve;
  const items: string[] = [
    improve.makeEasier,
    improve.makeHarder,
    improve.convertToNewGeneration,
    improve.increaseVisualQuestions,
    improve.addGraphQuestions,
    improve.improveDistractors,
    improve.shortenQuiz,
    improve.expandQuiz,
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="secondary" size="sm" disabled={disabled}>
            <Sparkles className="size-3.5" aria-hidden="true" />
            {improve.trigger}
            <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent>
        {items.map((label) => (
          <DropdownMenuItem
            key={label}
            disabled
            aria-disabled="true"
            onClick={(event) => event.preventDefault()}
            className="cursor-not-allowed justify-between gap-2 opacity-60"
          >
            {label}
            <Badge variant="outline">{improve.comingSoonBadge}</Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
