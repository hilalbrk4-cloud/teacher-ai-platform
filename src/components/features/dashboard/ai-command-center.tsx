"use client";

import * as React from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/lib/i18n/locale-provider";
import { quickPrompts, teacherProfile } from "@/lib/mock-data";

const firstName = teacherProfile.name.split(" ")[0];
const GENERATING_DURATION_MS = 1100;

export function AiCommandCenter() {
  const t = useTranslations();
  const [prompt, setPrompt] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleQuickPrompt(template: string) {
    setPrompt(template);
    inputRef.current?.focus();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    window.setTimeout(() => setIsGenerating(false), GENERATING_DURATION_MS);
  }

  return (
    <section className="flex flex-col items-center gap-4 px-2 py-5 text-center sm:py-7">
      <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="size-5" aria-hidden="true" />
      </span>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-muted-foreground">{t.commandCenter.greeting(firstName)}</p>
        <h1 className="text-balance text-2xl leading-snug font-semibold tracking-tight text-foreground sm:text-3xl">
          {t.commandCenter.heading}
        </h1>
        <p className="text-balance text-sm leading-relaxed text-muted-foreground">
          {t.commandCenter.helperText}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-2xl flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <Sparkles
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-primary/50"
            aria-hidden="true"
          />
          <Input
            ref={inputRef}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={t.commandCenter.placeholder}
            aria-label={t.commandCenter.inputLabel}
            className="h-13 w-full rounded-2xl border-border/80 bg-card pr-4.5 pl-11 text-[0.925rem] shadow-sm transition-shadow duration-200 placeholder:text-muted-foreground/70 hover:shadow-md focus-visible:border-primary/40 focus-visible:shadow-md focus-visible:ring-4 focus-visible:ring-primary/15"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={isGenerating}
          className="h-13 shrink-0 gap-1.5 rounded-2xl px-6 shadow-sm transition-all duration-200 hover:shadow-md hover:shadow-primary/20 active:scale-[0.98] disabled:opacity-100"
        >
          {isGenerating ? (
            <>
              {t.commandCenter.generating}
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            </>
          ) : (
            <>
              {t.commandCenter.generate}
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </form>

      <div className="flex max-w-2xl flex-wrap justify-center gap-2">
        {quickPrompts.map((item) => {
          const Icon = item.icon;
          const copy = t.quickPrompts[item.id];
          return (
            <Button
              key={item.id}
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full border-border bg-card text-muted-foreground transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 hover:text-foreground hover:shadow-sm active:translate-y-0 active:scale-[0.97] active:bg-primary/10"
              onClick={() => handleQuickPrompt(copy.prompt)}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {copy.label}
            </Button>
          );
        })}
      </div>
    </section>
  );
}
