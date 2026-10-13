"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { SlideCanvas } from "@/components/features/presentation-builder/slide-canvas";
import type { SlideTimerHandle } from "@/components/features/presentation-builder/slide-timer";
import type { SlideImageState } from "@/hooks/use-slide-images";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/types/i18n";
import type { Presentation } from "@/types/presentation";

interface SmartBoardProps {
  t: Dictionary;
  presentation: Presentation;
  index: number;
  onIndexChange: (index: number) => void;
  imageFor: (slideNumber: number) => SlideImageState;
  onClose: () => void;
  onFullscreenUnavailable: () => void;
}

const CONTROLS_HIDE_MS = 2500;

/**
 * Akıllı Tahta Modu: tam ekran, klavyeyle (← → Boşluk PageUp/PageDown Home/End)
 * geçiş, etkinlik slaytlarında "T" ile süre sayacı, Esc ile çıkış. Öğretmen
 * notu tahtada gösterilmez. Kontroller fare hareketsizken gizlenir.
 */
export function SmartBoard({ t, presentation, index, onIndexChange, imageFor, onClose, onFullscreenUnavailable }: SmartBoardProps) {
  const copy = t.presentationBuilder.board;
  const rootRef = React.useRef<HTMLDivElement>(null);
  const timerRef = React.useRef<SlideTimerHandle>(null);
  const [controlsVisible, setControlsVisible] = React.useState(true);
  const hideTimeout = React.useRef<number | undefined>(undefined);
  const slide = presentation.slides[index];
  const last = presentation.slides.length - 1;

  const showControls = React.useCallback(() => {
    setControlsVisible(true);
    window.clearTimeout(hideTimeout.current);
    hideTimeout.current = window.setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_MS);
  }, []);

  // Tam ekran: açılışta iste, tarayıcı izin vermezse pencere içinde devam et; tam ekrandan çıkılınca modu kapat.
  React.useEffect(() => {
    const root = rootRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    root?.focus();
    let enteredFullscreen = false;
    if (root?.requestFullscreen) {
      root.requestFullscreen().then(
        () => {
          enteredFullscreen = true;
        },
        () => onFullscreenUnavailable()
      );
    } else {
      onFullscreenUnavailable();
    }
    const onFullscreenChange = () => {
      if (enteredFullscreen && !document.fullscreenElement) onClose();
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    // Kontroller görünür başlar; yalnızca gizleme zamanlayıcısı kurulur.
    hideTimeout.current = window.setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_MS);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.clearTimeout(hideTimeout.current);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
      previousFocus?.focus();
    };
    // Yalnızca açılışta çalışır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleKeyDown(event: React.KeyboardEvent) {
    const go = (next: number) => {
      event.preventDefault();
      onIndexChange(Math.min(last, Math.max(0, next)));
    };
    switch (event.key) {
      case "ArrowRight":
      case "PageDown":
      case " ":
        go(index + 1);
        break;
      case "ArrowLeft":
      case "PageUp":
        go(index - 1);
        break;
      case "Home":
        go(0);
        break;
      case "End":
        go(last);
        break;
      case "t":
      case "T":
        if (slide.layout === "activity-timer") {
          event.preventDefault();
          timerRef.current?.toggle();
        }
        break;
      case "Escape":
        event.preventDefault();
        onClose();
        break;
      default:
        return;
    }
    showControls();
  }

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${presentation.title} — ${t.presentationBuilder.preview.slideLabel(index + 1, presentation.slides.length)}`}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onMouseMove={showControls}
      className={cn("fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 outline-none", !controlsVisible && "cursor-none")}
    >
      <div className="w-[min(100vw,calc(100vh*16/9))]">
        {/* Anahtar: slayt değişince sayaç sıfırlanır. */}
        <SlideCanvas
          key={slide.slideNumber}
          t={t}
          slide={slide}
          image={imageFor(slide.slideNumber)}
          meta={{ subject: presentation.subject, gradeLevel: presentation.gradeLevel }}
          total={presentation.slides.length}
          mode="board"
          timerRef={timerRef}
        />
      </div>

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/70 to-transparent px-5 pt-10 pb-4 text-white transition-opacity duration-300",
          controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <span className="text-xs text-white/70">{copy.hint}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onIndexChange(Math.max(0, index - 1))}
            disabled={index === 0}
            aria-label={t.presentationBuilder.preview.previous}
            className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <span className="min-w-16 text-center text-sm font-semibold tabular-nums" aria-live="polite">
            {index + 1} / {presentation.slides.length}
          </span>
          <button
            type="button"
            onClick={() => onIndexChange(Math.min(last, index + 1))}
            disabled={index === last}
            aria-label={t.presentationBuilder.preview.next}
            className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
        >
          <X className="size-4" aria-hidden="true" />
          {copy.close}
        </button>
      </div>
    </div>
  );
}
