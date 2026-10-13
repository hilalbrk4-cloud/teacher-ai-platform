"use client";

import * as React from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Dictionary } from "@/types/i18n";

export const ACTIVITY_SECONDS = 120;

export interface SlideTimerHandle {
  toggle: () => void;
  reset: () => void;
}

interface SlideTimerProps {
  t: Dictionary;
  /** Küçük minyatürlerde yalnızca süre gösterilir, düğme yoktur. */
  interactive: boolean;
}

/**
 * 2 dakikalık etkinlik sayacı. Boyutları slayt kapsayıcısına göre (cqw)
 * ölçeklenir; tahta modunda "T" kısayolu `ref.toggle()` ile çalışır.
 */
export const SlideTimer = React.forwardRef<SlideTimerHandle, SlideTimerProps>(function SlideTimer({ t, interactive }, ref) {
  const copy = t.presentationBuilder.board;
  const [remaining, setRemaining] = React.useState(ACTIVITY_SECONDS);
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const toggle = React.useCallback(() => {
    if (remaining === 0) {
      setRemaining(ACTIVITY_SECONDS);
      setRunning(true);
      return;
    }
    setRunning((value) => !value);
  }, [remaining]);
  const reset = React.useCallback(() => {
    setRunning(false);
    setRemaining(ACTIVITY_SECONDS);
  }, []);
  React.useImperativeHandle(ref, () => ({ toggle, reset }), [toggle, reset]);

  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, "0");
  const progress = remaining / ACTIVITY_SECONDS;
  const done = remaining === 0;

  return (
    <div className="flex flex-col items-center gap-[1.2cqw]">
      <div
        role="timer"
        aria-label={copy.timerLabel}
        aria-live={done ? "assertive" : "off"}
        className="relative flex aspect-square w-[19cqw] items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${done ? "#dc2626" : "#f59e0b"} ${progress * 360}deg, rgba(15,23,42,0.08) 0deg)`,
        }}
      >
        <div className="absolute inset-[1.1cqw] rounded-full bg-white" />
        <span className={cn("relative font-bold tabular-nums text-[4.6cqw]", done ? "text-red-600" : "text-slate-900")}>
          {done ? copy.timerDone : `${minutes}:${seconds}`}
        </span>
      </div>
      {interactive ? (
        <div className="flex gap-[0.8cqw]">
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-[0.5cqw] rounded-full bg-slate-900 px-[1.6cqw] py-[0.7cqw] text-[1.4cqw] font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-[0.3cqw] focus-visible:ring-amber-400"
          >
            {running ? <Pause className="size-[1.6cqw]" aria-hidden="true" /> : <Play className="size-[1.6cqw]" aria-hidden="true" />}
            {running ? copy.timerPause : copy.timerStart}
          </button>
          <button
            type="button"
            onClick={reset}
            aria-label={copy.timerReset}
            className="flex items-center rounded-full bg-white px-[1.2cqw] py-[0.7cqw] text-[1.4cqw] text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-[0.3cqw] focus-visible:ring-amber-400"
          >
            <RotateCcw className="size-[1.6cqw]" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
});
