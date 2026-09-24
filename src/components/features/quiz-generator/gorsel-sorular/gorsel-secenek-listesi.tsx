import type { ReactNode } from "react";

import { secenekHarfi } from "@/lib/quiz-generator/gorsel-sorular/ortak";
import { cn } from "@/lib/utils";

export interface GorselSecenek {
  id: string;
  icerik: ReactNode;
}

interface GorselSecenekListesiProps {
  secenekler: GorselSecenek[];
  dogruSecenekId: string;
  showAnswer: boolean;
  correctMark: string;
}

/** Tüm görsel soru tiplerinde ortak şık listesi; harfler sıradan türetilir. */
export function GorselSecenekListesi({ secenekler, dogruSecenekId, showAnswer, correctMark }: GorselSecenekListesiProps) {
  return (
    <ol className="flex flex-col gap-1.5">
      {secenekler.map((secenek, index) => {
        const dogru = showAnswer && secenek.id === dogruSecenekId;
        return (
          <li
            key={secenek.id}
            className={cn(
              "flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors",
              dogru
                ? "border-emerald-500/50 bg-emerald-50 dark:border-emerald-400/40 dark:bg-emerald-500/10"
                : "border-border/70"
            )}
          >
            <span
              className={cn(
                "w-5 shrink-0 font-semibold",
                dogru ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
              )}
            >
              {secenekHarfi(index)})
            </span>
            <span className="min-w-0 flex-1 text-foreground">{secenek.icerik}</span>
            {dogru ? (
              <span className="shrink-0 text-xs font-medium text-emerald-600 dark:text-emerald-400">{correctMark}</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
