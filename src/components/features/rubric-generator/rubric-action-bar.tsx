"use client";

import { FileText, Loader2, RefreshCw, Scissors } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RubricExportKind } from "@/hooks/use-rubric-generator";
import type { Dictionary } from "@/types/i18n";

interface RubricActionBarProps {
  t: Dictionary;
  isRegenerating: boolean;
  exporting: RubricExportKind | null;
  onExport: (kind: RubricExportKind) => void;
  onRegenerate: () => void;
}

/** Dışa aktarım: resmî Word rubriği ve fotokopiye hazır öğrenci kâğıdı (A4'te 2 × A5). */
export function RubricActionBar({ t, isRegenerating, exporting, onExport, onRegenerate }: RubricActionBarProps) {
  const actions = t.rubricGenerator.actions;
  const busy = isRegenerating || exporting !== null;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Button type="button" onClick={() => onExport("rubrik")} disabled={busy} aria-busy={exporting === "rubrik"} className="gap-1.5">
        {exporting === "rubrik" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <FileText className="size-4" aria-hidden="true" />}
        {exporting === "rubrik" ? actions.exporting : actions.exportOfficial}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => onExport("ogrenci")}
        disabled={busy}
        aria-busy={exporting === "ogrenci"}
        title={actions.exportStudentHint}
        className="gap-1.5"
      >
        {exporting === "ogrenci" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Scissors className="size-4" aria-hidden="true" />}
        {exporting === "ogrenci" ? actions.exporting : actions.exportStudent}
      </Button>
      <span className="text-xs text-muted-foreground sm:hidden">{actions.exportStudentHint}</span>
      <Button type="button" variant="ghost" onClick={onRegenerate} disabled={busy} className="gap-1.5 sm:ml-auto">
        {isRegenerating ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
        {isRegenerating ? actions.regenerating : actions.regenerate}
      </Button>
    </div>
  );
}
