"use client";

import * as React from "react";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface RubricChoiceOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: LucideIcon;
  /** Seçeneğin altında küçük önizleme (ör. seviye etiketleri). */
  preview?: React.ReactNode;
}

interface RubricChoiceGroupProps<T extends string> {
  label: string;
  value: T;
  options: RubricChoiceOption<T>[];
  onChange: (value: T) => void;
  columns?: string;
}

/**
 * Kart görünümlü tek seçim grubu (WAI-ARIA radiogroup): ok tuşlarıyla
 * gezinilir, yalnızca seçili kart sekme sırasındadır.
 */
export function RubricChoiceGroup<T extends string>({ label, value, options, onChange, columns }: RubricChoiceGroupProps<T>) {
  const id = React.useId();
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = (index + keys[event.key] + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p id={id} className="text-sm font-medium text-foreground">
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={id} className={cn("grid gap-2", columns ?? "grid-cols-1 sm:grid-cols-2")}>
        {options.map((option, index) => {
          const selected = option.value === value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              ref={(element) => {
                refs.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                "flex min-w-0 items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                selected ? "border-primary/50 bg-primary/[0.06] ring-1 ring-primary/20" : "border-border bg-card hover:border-primary/30 hover:bg-primary/[0.03]"
              )}
            >
              {Icon ? (
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-md",
                    selected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                  )}
                >
                  {selected ? <Check className="size-3.5" aria-hidden="true" /> : <Icon className="size-3.5" aria-hidden="true" />}
                </span>
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold leading-snug text-foreground">{option.label}</span>
                {option.description ? (
                  <span className="mt-0.5 block text-[0.7rem] leading-snug text-muted-foreground">{option.description}</span>
                ) : null}
                {option.preview}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
