"use client";

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  ClipboardPaste,
  FileSpreadsheet,
  Loader2,
  PencilLine,
  RotateCcw,
  Sparkles,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLiveAssessment } from "@/hooks/use-live-assessment";
import { applyStudentName, buildFeedbackRequest } from "@/lib/rubric/live/ai-feedback";
import { downloadClassSheet } from "@/lib/rubric/live/excel";
import { parseRoster } from "@/lib/rubric/live/roster";
import { liveStatus, liveTotal } from "@/lib/rubric/live/scoring";
import type { LiveStatus } from "@/lib/rubric/live/types";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/types/i18n";
import { RUBRIC_SCALE_LEVELS, type Rubric } from "@/types/rubric";

interface RubricLiveAssessmentProps {
  t: Dictionary;
  rubric: Rubric;
}

const STATUS_STYLE: Record<LiveStatus, { icon: typeof CheckCircle2; className: string }> = {
  done: { icon: CheckCircle2, className: "text-emerald-600 dark:text-emerald-400" },
  partial: { icon: CircleDot, className: "text-amber-600 dark:text-amber-400" },
  waiting: { icon: CircleDashed, className: "text-muted-foreground" },
};

/** Seviye seçimi: radyo grubu, ok tuşlarıyla gezinilir; seviyeler yüksekten düşüğe. */
function LevelPicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { index: number; title: string; points?: string; description: string }[];
  value: number | undefined;
  onChange: (index: number) => void;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const focusIndex = value === undefined ? 0 : options.findIndex((option) => option.index === value);

  function handleKeyDown(event: React.KeyboardEvent, position: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (position + step + options.length) % options.length;
    onChange(options[next].index);
    refs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-1 gap-1.5 @lg:grid-cols-2 @3xl:grid-cols-4">
      {options.map((option, position) => {
        const selected = option.index === value;
        return (
          <button
            key={option.index}
            ref={(element) => {
              refs.current[position] = element;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={position === Math.max(focusIndex, 0) ? 0 : -1}
            onClick={() => onChange(option.index)}
            onKeyDown={(event) => handleKeyDown(event, position)}
            title={option.description}
            className={cn(
              "flex min-w-0 flex-col items-start gap-0.5 rounded-lg border px-2.5 py-2 text-left transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              selected
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card hover:border-primary/40 hover:bg-primary/[0.04]"
            )}
          >
            <span className="flex w-full items-center justify-between gap-2 text-xs font-semibold">
              {option.title}
              {option.points ? (
                <span className={cn("tabular-nums", selected ? "text-primary-foreground/90" : "text-primary")}>{option.points}</span>
              ) : null}
            </span>
            <span className={cn("line-clamp-2 text-[0.7rem] leading-snug", selected ? "text-primary-foreground/85" : "text-muted-foreground")}>
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Canlı Değerlendirme Modu: sınıf listesi yükleme, öğrenci seçimi, kriter
 * kartlarında seviye seçimi, anlık toplam, otomatik geri bildirim ve tüm
 * sınıfın Excel çizelgesi.
 */
export function RubricLiveAssessment({ t, rubric }: RubricLiveAssessmentProps) {
  const copy = t.rubricGenerator.live;
  const levelLabels = t.rubricGenerator.levels;
  const live = useLiveAssessment(rubric);
  const { session, selectedId } = live;
  const [rosterOpen, setRosterOpen] = React.useState(session.students.length === 0);
  const [rosterText, setRosterText] = React.useState("");
  const [notice, setNotice] = React.useState<{ type: "success" | "error"; message: string } | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const [aiLoadingFor, setAiLoadingFor] = React.useState<string | null>(null);
  const scoringRef = React.useRef<HTMLDivElement>(null);

  const levels = RUBRIC_SCALE_LEVELS[rubric.scale];
  const order = levels.map((_, index) => levels.length - 1 - index);
  const holistic = rubric.rubricType === "butuncul";
  const detected = rosterText.trim() ? parseRoster(rosterText).length : 0;
  const doneCount = session.students.filter((student) => liveStatus(rubric, session.scores[student.id]) === "done").length;

  const selectedIndex = session.students.findIndex((student) => student.id === selectedId);
  const student = selectedIndex >= 0 ? session.students[selectedIndex] : undefined;
  const score = student ? session.scores[student.id] : undefined;
  const total = liveTotal(rubric, score);
  const status = liveStatus(rubric, score);
  const scoredCriteria = holistic ? (score?.holisticLevel === undefined ? 0 : 1) : rubric.criteria.filter((criterion) => score?.levels[criterion.id] !== undefined).length;

  function loadRoster() {
    const count = live.loadRoster(rosterText);
    if (count === 0) {
      setNotice({ type: "error", message: copy.rosterEmpty });
      return;
    }
    setNotice({ type: "success", message: copy.rosterLoaded(count) });
    setRosterText("");
    setRosterOpen(false);
  }

  function goTo(index: number) {
    const target = session.students[index];
    if (!target) return;
    live.setSelectedId(target.id);
    scoringRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  /** AI geri bildirimi: ad gönderilmez; yanıttaki {AD} yer tutucusu tarayıcıda öğrencinin adıyla değiştirilir. */
  async function writeWithAi(studentId: string, fullName: string) {
    const current = session.scores[studentId];
    if (!current) return;
    const payload = buildFeedbackRequest(rubric, current, liveTotal(rubric, current));
    if (!payload) return;
    setAiLoadingFor(studentId);
    try {
      const response = await fetch("/api/rubrics/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as { feedback?: string; error?: { message?: string } } | null;
      if (!response.ok || !body?.feedback) throw new Error(body?.error?.message ?? copy.feedbackAiError);
      live.setAiFeedback(studentId, applyStudentName(body.feedback, fullName));
    } catch (error) {
      console.error("[EduPilot] AI feedback failed:", error);
      setNotice({ type: "error", message: copy.feedbackAiError });
    } finally {
      setAiLoadingFor(null);
    }
  }

  async function exportSheet() {
    setExporting(true);
    try {
      const fileName = await downloadClassSheet(rubric, session);
      setNotice({ type: "success", message: copy.exported(fileName) });
    } catch (error) {
      console.error("[EduPilot] Class sheet export failed:", error);
      setNotice({ type: "error", message: copy.exportError });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="@container flex flex-col gap-4">
      {notice ? (
        <p
          role="status"
          aria-live="polite"
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium",
            notice.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
          )}
        >
          {notice.message}
        </p>
      ) : null}

      {rosterOpen ? (
        <section aria-labelledby="live-roster-title" className="flex flex-col gap-2.5 rounded-xl border border-primary/15 bg-primary/[0.03] p-3.5">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ClipboardPaste className="size-3.5" aria-hidden="true" />
            </span>
            <div>
              <h3 id="live-roster-title" className="text-sm font-semibold text-foreground">
                {copy.rosterTitle}
              </h3>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{copy.rosterDescription}</p>
            </div>
          </div>
          <Textarea
            id="live-roster"
            aria-labelledby="live-roster-title"
            rows={6}
            value={rosterText}
            placeholder={copy.rosterPlaceholder}
            onChange={(event) => setRosterText(event.target.value)}
            className="font-mono text-[0.8rem]"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={loadRoster} disabled={detected === 0} className="gap-1.5">
              <Users className="size-4" aria-hidden="true" />
              {copy.rosterLoad}
            </Button>
            {session.students.length > 0 ? (
              <Button type="button" variant="ghost" onClick={() => setRosterOpen(false)}>
                {copy.rosterCancel}
              </Button>
            ) : null}
            {detected > 0 ? <span className="text-xs font-medium text-primary">{copy.rosterDetected(detected)}</span> : null}
          </div>
        </section>
      ) : null}

      {session.students.length > 0 ? (
        <div className="grid grid-cols-1 items-start gap-4 @3xl:grid-cols-[minmax(0,250px)_1fr]">
          {/* Öğrenci listesi */}
          <nav aria-label={copy.studentsTitle} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2.5 @3xl:sticky @3xl:top-[4.75rem]">
            <div className="flex items-center justify-between gap-2 px-1">
              <div>
                <p className="text-sm font-semibold text-foreground">{copy.studentsTitle}</p>
                <p className="text-xs text-muted-foreground">{copy.progress(doneCount, session.students.length)}</p>
              </div>
              {!rosterOpen ? (
                <Button type="button" variant="ghost" size="xs" onClick={() => setRosterOpen(true)} className="gap-1">
                  <PencilLine aria-hidden="true" />
                  {copy.rosterEdit}
                </Button>
              ) : null}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(doneCount / session.students.length) * 100}%` }} />
            </div>
            <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto @3xl:max-h-[32rem]">
              {session.students.map((item, index) => {
                const itemStatus = liveStatus(rubric, session.scores[item.id]);
                const { icon: StatusIcon, className } = STATUS_STYLE[itemStatus];
                const current = item.id === selectedId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-current={current ? "true" : undefined}
                      onClick={() => goTo(index)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        current ? "bg-primary/10 ring-1 ring-primary/25" : "hover:bg-muted"
                      )}
                    >
                      <StatusIcon className={cn("size-4 shrink-0", className)} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{item.name}</span>
                        <span className="block text-[0.7rem] text-muted-foreground">
                          {item.no ? `No ${item.no} · ` : ""}
                          {copy.status[itemStatus]}
                        </span>
                      </span>
                      {itemStatus !== "waiting" ? (
                        <Badge variant={itemStatus === "done" ? "default" : "secondary"} className="tabular-nums">
                          {liveTotal(rubric, session.scores[item.id])}
                        </Badge>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Puanlama */}
          {student ? (
            <div ref={scoringRef} className="flex min-w-0 scroll-mt-20 flex-col gap-3">
              <div className="sticky top-[4.5rem] z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/95 px-3.5 py-2.5 shadow-sm backdrop-blur">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-foreground">{student.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {student.no ? `No ${student.no} · ` : ""}
                    {copy.criterionProgress(scoredCriteria, holistic ? 1 : rubric.criteria.length)} · {copy.status[status]}
                  </p>
                </div>
                <div className="text-right" aria-live="polite">
                  <p className="text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">{copy.totalLabel}</p>
                  <p className="text-2xl font-bold tabular-nums leading-none text-primary">{copy.outOf(total)}</p>
                </div>
              </div>

              {holistic ? (
                <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5">
                  <h3 className="text-sm font-semibold text-foreground">{copy.holisticLevelTitle}</h3>
                  <LevelPicker
                    label={copy.holisticLevelTitle}
                    value={score?.holisticLevel}
                    onChange={(level) => live.setHolisticLevel(student.id, level)}
                    options={order.map((index) => ({
                      index,
                      title: levelLabels[levels[index].id],
                      points: `${rubric.holisticLevels[index].range.min}–${rubric.holisticLevels[index].range.max}`,
                      description: rubric.holisticLevels[index].teacher,
                    }))}
                  />
                  {score?.holisticLevel !== undefined ? (
                    <label className="mt-1 flex items-center gap-2 text-sm text-foreground">
                      {copy.holisticScoreLabel(
                        rubric.holisticLevels[score.holisticLevel].range.min,
                        rubric.holisticLevels[score.holisticLevel].range.max
                      )}
                      <Input
                        type="number"
                        inputMode="numeric"
                        className="h-8 w-20 tabular-nums"
                        min={rubric.holisticLevels[score.holisticLevel].range.min}
                        max={rubric.holisticLevels[score.holisticLevel].range.max}
                        value={score.holisticScore ?? ""}
                        onChange={(event) => live.setHolisticScore(student.id, Number(event.target.value))}
                      />
                    </label>
                  ) : null}
                </section>
              ) : (
                <ol className="flex flex-col gap-2.5">
                  {rubric.criteria.map((criterion, number) => {
                    const selected = score?.levels[criterion.id];
                    return (
                      <li key={criterion.id} className={cn("rounded-xl border bg-card p-3", selected === undefined ? "border-border" : "border-primary/30")}>
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                              {number + 1}. {criterion.teacherCriterion.title}
                            </p>
                            <p className="text-xs leading-snug text-muted-foreground">{criterion.teacherCriterion.description}</p>
                          </div>
                          <Badge variant="secondary" className="shrink-0 tabular-nums">
                            {selected === undefined ? `– / ${criterion.weight}` : `${criterion.levelPoints[selected]} / ${criterion.weight}`}
                          </Badge>
                        </div>
                        <LevelPicker
                          label={criterion.teacherCriterion.title}
                          value={selected}
                          onChange={(level) => live.setLevel(student.id, criterion.id, level)}
                          options={order.map((index) => ({
                            index,
                            title: levelLabels[levels[index].id],
                            points: copy.levelPoints(criterion.levelPoints[index]),
                            description: criterion.teacherCriterion.levels[index],
                          }))}
                        />
                      </li>
                    );
                  })}
                </ol>
              )}

              <section aria-labelledby="live-feedback-title" className="flex flex-col gap-2 rounded-xl border border-primary/15 bg-primary/[0.03] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 id="live-feedback-title" className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
                    {copy.feedbackTitle}
                    {score?.feedback ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          score.feedbackSource === "ai"
                            ? "border-violet-500/30 bg-violet-500/5 text-violet-700 dark:text-violet-400"
                            : score.feedbackEdited
                              ? "border-amber-500/30 text-amber-700 dark:text-amber-400"
                              : "border-primary/25 text-primary"
                        )}
                      >
                        {score.feedbackSource === "ai" ? copy.feedbackAiBadge : score.feedbackEdited ? copy.feedbackEdited : copy.feedbackAuto}
                      </Badge>
                    ) : null}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1">
                    {score?.feedbackEdited ? (
                      <Button type="button" variant="ghost" size="xs" onClick={() => live.regenerateFeedback(student.id)} className="gap-1">
                        <RotateCcw aria-hidden="true" />
                        {copy.feedbackRegenerate}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => writeWithAi(student.id, student.name)}
                      disabled={status === "waiting" || aiLoadingFor !== null}
                      aria-busy={aiLoadingFor === student.id}
                      className="gap-1 border-violet-500/30 text-violet-700 hover:bg-violet-500/5 dark:text-violet-400"
                    >
                      {aiLoadingFor === student.id ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
                      {aiLoadingFor === student.id ? copy.feedbackAiLoading : copy.feedbackAi}
                    </Button>
                  </div>
                </div>
                <Textarea
                  id="live-feedback"
                  aria-labelledby="live-feedback-title"
                  rows={3}
                  value={score?.feedback ?? ""}
                  placeholder={copy.feedbackPlaceholder}
                  onChange={(event) => live.setFeedback(student.id, event.target.value)}
                  className="bg-card text-sm leading-relaxed"
                />
                <p className="text-[0.7rem] text-muted-foreground">{copy.feedbackAiPrivacy}</p>
              </section>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={() => goTo(selectedIndex - 1)} disabled={selectedIndex <= 0} className="gap-1.5">
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  {copy.previous}
                </Button>
                <Button
                  type="button"
                  onClick={() => goTo(selectedIndex + 1)}
                  disabled={selectedIndex >= session.students.length - 1}
                  className="gap-1.5"
                >
                  {copy.next}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
                {status !== "waiting" ? (
                  <Button type="button" variant="ghost" onClick={() => live.resetStudent(student.id)} className="ml-auto gap-1.5 text-muted-foreground">
                    <RotateCcw className="size-4" aria-hidden="true" />
                    {copy.reset}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {session.students.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-border pt-4 @lg:flex-row @lg:items-center @lg:justify-between">
          <p className="text-xs text-muted-foreground">{copy.storageNote}</p>
          <Button type="button" variant="outline" onClick={exportSheet} disabled={exporting} aria-busy={exporting} className="gap-1.5 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10">
            {exporting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <FileSpreadsheet className="size-4" aria-hidden="true" />}
            {exporting ? copy.exporting : copy.exportSheet}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
