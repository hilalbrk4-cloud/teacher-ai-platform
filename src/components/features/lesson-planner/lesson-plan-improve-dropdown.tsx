"use client";

import { ChevronDown, Maximize2, Minimize2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Dictionary } from "@/types/i18n";

interface LessonPlanImproveDropdownProps {
  t: Dictionary;
  disabled: boolean;
  onShorten: () => void;
  onExpand: () => void;
}

export function LessonPlanImproveDropdown({
  t,
  disabled,
  onShorten,
  onExpand,
}: LessonPlanImproveDropdownProps) {
  const actions = t.lessonPlanner.result.actions;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="secondary" size="sm" disabled={disabled}>
            <Sparkles className="size-3.5" aria-hidden="true" />
            {t.lessonPlanner.result.improve.trigger}
            <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent>
        <DropdownMenuItem onClick={onShorten}>
          <Minimize2 className="size-3.5" aria-hidden="true" />
          {actions.shorten}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExpand}>
          <Maximize2 className="size-3.5" aria-hidden="true" />
          {actions.expand}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
