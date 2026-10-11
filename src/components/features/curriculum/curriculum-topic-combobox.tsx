"use client";

import * as React from "react";
import { BookMarked, Check, ChevronsUpDown, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CurriculumGradeData, CurriculumTopic, CurriculumUnit } from "@/types/curriculum";
import type { Dictionary } from "@/types/i18n";

interface CurriculumTopicComboboxProps {
  t: Dictionary;
  id: string;
  grade: CurriculumGradeData;
  value: string;
  selectedTopicId?: string;
  invalid?: boolean;
  describedBy?: string;
  onSelect: (unit: CurriculumUnit, topic: CurriculumTopic) => void;
  onFreeText: (value: string) => void;
}

const normalize = (value: string) => value.toLocaleLowerCase("tr-TR").normalize("NFC").trim();

/**
 * Aranabilir konu seçici (WAI-ARIA combobox deseni). Seçilen ders ve sınıfın
 * ünite → konu listesini gösterir; öğretmen listeden seçebilir ya da listede
 * olmayan bir konuyu serbestçe yazmaya devam edebilir.
 */
export function CurriculumTopicCombobox({
  t,
  id,
  grade,
  value,
  selectedTopicId,
  invalid,
  describedBy,
  onSelect,
  onFreeText,
}: CurriculumTopicComboboxProps) {
  const copy = t.curriculum;
  const listboxId = `${id}-listbox`;
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);

  // Seçili konu adı yazılıyken tüm liste; aksi hâlde yazılan metne göre süzülmüş liste.
  const query = selectedTopicId ? "" : normalize(value);
  const groups = React.useMemo(
    () =>
      grade.units
        .map((unit) => ({
          unit,
          topics: query
            ? unit.topics.filter((topic) => normalize(topic.name).includes(query) || normalize(unit.name).includes(query))
            : unit.topics,
        }))
        .filter((group) => group.topics.length > 0),
    [grade, query]
  );
  const options = React.useMemo(
    () => groups.flatMap((group) => group.topics.map((topic) => ({ unit: group.unit, topic }))),
    [groups]
  );
  const safeActive = Math.min(activeIndex, Math.max(options.length - 1, 0));
  const activeId = open && options[safeActive] ? `${id}-option-${safeActive}` : undefined;

  React.useEffect(() => {
    if (!open || !activeId) return;
    document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [open, activeId]);

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    onSelect(option.unit, option.topic);
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      else setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open && options[safeActive]) {
      event.preventDefault();
      choose(safeActive);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  let optionIndex = -1;

  return (
    <div className="relative">
      <div className="relative">
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          autoComplete="off"
          value={value}
          placeholder={copy.topicPlaceholder}
          onChange={(event) => {
            onFreeText(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
          className={cn("pr-16", selectedTopicId && "border-primary/40 bg-primary/[0.03]")}
        />
        <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">
          {selectedTopicId ? (
            <button
              type="button"
              aria-label={copy.clearSelection}
              title={copy.clearSelection}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onFreeText(value)}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}
          <ChevronsUpDown className="mr-1 size-3.5 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>

      {selectedTopicId ? (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-primary">
          <BookMarked className="size-3" aria-hidden="true" />
          {copy.fromCurriculum} · {grade.subject}
        </p>
      ) : null}

      {open ? (
        <div
          className="absolute inset-x-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded-lg border border-border bg-popover shadow-lg ring-1 ring-foreground/5 animate-in fade-in-0 zoom-in-95 duration-100"
          onMouseDown={(event) => event.preventDefault()}
        >
          <ul id={listboxId} role="listbox" aria-label={copy.topicListLabel} className="max-h-72 overflow-y-auto py-1">
            {groups.length === 0 ? (
              <li role="presentation" className="px-3 py-2.5 text-xs text-muted-foreground">
                {copy.noTopicMatch(value.trim())} {copy.freeTopicOption(value.trim())}.
              </li>
            ) : (
              groups.map(({ unit, topics }) => (
                <li key={unit.id} role="presentation">
                  <div className="sticky top-0 z-10 bg-popover/95 px-3 pb-1 pt-2 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                    {unit.name}
                  </div>
                  <ul role="group" aria-label={unit.name}>
                    {topics.map((topic) => {
                      optionIndex += 1;
                      const index = optionIndex;
                      const selected = topic.id === selectedTopicId;
                      return (
                        <li
                          key={topic.id}
                          id={`${id}-option-${index}`}
                          role="option"
                          aria-selected={selected}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => choose(index)}
                          className={cn(
                            "flex cursor-pointer items-start gap-2 px-3 py-1.5 text-sm",
                            index === safeActive && "bg-accent text-accent-foreground",
                            selected && "font-medium text-primary"
                          )}
                        >
                          <Check className={cn("mt-0.5 size-3.5 shrink-0", selected ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                          <span className="min-w-0 flex-1 leading-snug">{topic.name}</span>
                          <span className="shrink-0 pt-0.5 text-[0.68rem] tabular-nums text-muted-foreground">
                            {topic.outcomeCodes.length}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
