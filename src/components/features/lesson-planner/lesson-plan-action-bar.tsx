"use client";

import {
  Check,
  Copy,
  CopyPlus,
  FileDown,
  Loader2,
  Pencil,
  Printer,
  RefreshCw,
  Save,
} from "lucide-react";

import { LessonPlanImproveDropdown } from "@/components/features/lesson-planner/lesson-plan-improve-dropdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Dictionary } from "@/types/i18n";

interface LessonPlanActionBarProps {
  t: Dictionary;
  isEditMode: boolean;
  isRegenerating: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  onCopyAll: () => void;
  onPrint: () => void;
  onRegenerate: () => void;
  onShorten: () => void;
  onExpand: () => void;
  onDuplicate: () => void;
}

export function LessonPlanActionBar({
  t,
  isEditMode,
  isRegenerating,
  onToggleEdit,
  onSave,
  onCopyAll,
  onPrint,
  onRegenerate,
  onShorten,
  onExpand,
  onDuplicate,
}: LessonPlanActionBarProps) {
  const actions = t.lessonPlanner.result.actions;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2.5 rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={isEditMode ? "default" : "outline"}
          size="sm"
          onClick={onToggleEdit}
          disabled={isRegenerating}
        >
          {isEditMode ? <Check className="size-3.5" aria-hidden="true" /> : <Pencil className="size-3.5" aria-hidden="true" />}
          {isEditMode ? actions.doneEditing : actions.edit}
        </Button>

        <Button type="button" variant="outline" size="sm" onClick={onSave} disabled={isRegenerating}>
          <Save className="size-3.5" aria-hidden="true" />
          {actions.save}
        </Button>

        <Button type="button" variant="outline" size="sm" onClick={onCopyAll} disabled={isRegenerating}>
          <Copy className="size-3.5" aria-hidden="true" />
          {actions.copyAll}
        </Button>

        <Button type="button" variant="outline" size="sm" onClick={onPrint} disabled={isRegenerating}>
          <Printer className="size-3.5" aria-hidden="true" />
          {actions.print}
        </Button>

        <Button type="button" variant="outline" size="sm" onClick={onDuplicate} disabled={isRegenerating}>
          <CopyPlus className="size-3.5" aria-hidden="true" />
          {actions.duplicate}
        </Button>
      </div>

      <Separator orientation="vertical" className="hidden h-6 sm:block" />

      <div className="flex flex-wrap items-center gap-2">
        <LessonPlanImproveDropdown
          t={t}
          disabled={isRegenerating}
          onShorten={onShorten}
          onExpand={onExpand}
        />

        <Button type="button" variant="secondary" size="sm" onClick={onRegenerate} disabled={isRegenerating}>
          {isRegenerating ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden="true" />
          )}
          {isRegenerating ? actions.regenerating : actions.regenerate}
        </Button>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-disabled="true"
                onClick={(event) => event.preventDefault()}
                className="cursor-not-allowed gap-1.5 opacity-60"
              >
                <FileDown className="size-3.5" aria-hidden="true" />
                {actions.exportWord}
                <Badge variant="outline" className="ml-0.5">
                  {t.lessonPlanner.result.comingSoonBadge}
                </Badge>
              </Button>
            }
          />
          <TooltipContent>{t.lessonPlanner.result.exportUnavailableTooltip}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-disabled="true"
                onClick={(event) => event.preventDefault()}
                className="cursor-not-allowed gap-1.5 opacity-60"
              >
                <FileDown className="size-3.5" aria-hidden="true" />
                {actions.exportPdf}
                <Badge variant="outline" className="ml-0.5">
                  {t.lessonPlanner.result.comingSoonBadge}
                </Badge>
              </Button>
            }
          />
          <TooltipContent>{t.lessonPlanner.result.exportUnavailableTooltip}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
