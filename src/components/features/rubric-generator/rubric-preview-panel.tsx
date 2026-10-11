"use client";

import { Tabs } from "@base-ui/react/tabs";
import { ClipboardList, GraduationCap, Sparkles, Timer, UserRound } from "lucide-react";

import { LessonPlanLoadingState } from "@/components/features/lesson-planner/lesson-plan-loading-state";
import { RubricLiveAssessment } from "@/components/features/rubric-generator/rubric-live-assessment";
import { RubricStudentView } from "@/components/features/rubric-generator/rubric-student-view";
import { RubricTeacherView } from "@/components/features/rubric-generator/rubric-teacher-view";
import { SectionTitle } from "@/components/shared/section-title";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/types/i18n";
import type { Rubric, RubricGenerationStatus } from "@/types/rubric";

interface RubricPreviewPanelProps {
  t: Dictionary;
  status: RubricGenerationStatus;
  loadingStage: number;
  rubric: Rubric | null;
  view: RubricView;
  onViewChange: (view: RubricView) => void;
}

/** "live": Canlı Değerlendirme Modu (çalışma alanı bu sekmede tam genişliğe geçer). */
export type RubricView = "teacher" | "student" | "live";

const TAB_CLASS =
  "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-semibold text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-selected:bg-card aria-selected:text-foreground aria-selected:shadow-sm sm:text-[0.8rem]";

/** Sağ panel: Öğretmen rubriği ve öğrenci kontrol listesi sekmeleri (çift görünüm). */
export function RubricPreviewPanel({ t, status, loadingStage, rubric, view, onViewChange }: RubricPreviewPanelProps) {
  const copy = t.rubricGenerator.preview;
  const liveCopy = t.rubricGenerator.live;
  const isLoading = status === "loading";

  if (!rubric) {
    return (
      <Card className="flex flex-col gap-4 overflow-hidden p-0">
        <div className="border-b border-border bg-muted/40 px-4 py-3.5 lg:px-5">
          <SectionTitle title={copy.title} />
        </div>
        <div className="flex flex-col gap-4 px-4 pb-5 lg:px-5">
          {isLoading ? (
            <LessonPlanLoadingState
              message={t.rubricGenerator.loadingMessages[loadingStage]}
              stage={loadingStage}
              totalStages={t.rubricGenerator.loadingMessages.length}
            />
          ) : (
            <div className="flex items-start gap-2.5 rounded-lg border border-dashed border-border px-3.5 py-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="size-3.5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{copy.emptyTitle}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{copy.emptyDescription}</p>
              </div>
            </div>
          )}
          <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", isLoading && "opacity-60")} aria-hidden="true">
            {[
              { icon: GraduationCap, label: copy.teacherTab },
              { icon: UserRound, label: copy.studentTab },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-lg border border-border/70 bg-card/60 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Icon className="size-3.5 text-primary" />
                  {label}
                </p>
                <div className="mt-3 flex flex-col gap-1.5">
                  {[100, 85, 70].map((width) => (
                    <div key={width} className={cn("h-2.5 rounded-full bg-muted", isLoading && "animate-pulse")} style={{ width: `${width}%` }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // overflow-clip: köşeleri kırpar ama kaydırma kabı oluşturmaz; Canlı Değerlendirme’deki yapışkan (sticky)
  // toplam başlığı ve öğrenci listesi bu sayede görünüm alanına göre sabitlenir.
  return (
    <Card id="rubric-print-area" className="flex flex-col gap-0 overflow-clip p-0 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <div className="flex flex-col gap-2 border-b border-border bg-muted/40 px-4 py-3.5 lg:px-5">
        <SectionTitle title={rubric.taskTitle} description={`${rubric.subject} · ${rubric.gradeLevel} · ${rubric.topic}`} />
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{t.rubricGenerator.form.taskTypes[rubric.taskType].label}</Badge>
          <Badge variant="secondary">{t.rubricGenerator.form.rubricTypes[rubric.rubricType].label}</Badge>
          <Badge variant="secondary">{t.rubricGenerator.form.scales[String(rubric.scale) as "3" | "4"]}</Badge>
          {rubric.curriculum ? (
            <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
              <ClipboardList aria-hidden="true" />
              TYMM · {rubric.curriculum.outcomes.length}
            </Badge>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="px-4 pt-4 lg:px-5">
          <LessonPlanLoadingState
            message={t.rubricGenerator.loadingMessages[loadingStage]}
            stage={loadingStage}
            totalStages={t.rubricGenerator.loadingMessages.length}
          />
        </div>
      ) : null}

      <Tabs.Root value={view} onValueChange={(value) => onViewChange(value as RubricView)} className={cn("@container flex flex-col", isLoading && "pointer-events-none opacity-50")}>
        <div className="px-4 pt-4 lg:px-5">
          <Tabs.List aria-label={copy.tabsLabel} className="flex gap-1 rounded-lg bg-muted p-1">
            <Tabs.Tab value="teacher" className={TAB_CLASS}>
              <GraduationCap className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden truncate @2xl:inline">{copy.teacherTab}</span>
              <span className="truncate @2xl:hidden">{copy.teacherTabShort}</span>
            </Tabs.Tab>
            <Tabs.Tab value="student" className={TAB_CLASS}>
              <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden truncate @2xl:inline">{copy.studentTab}</span>
              <span className="truncate @2xl:hidden">{copy.studentTabShort}</span>
            </Tabs.Tab>
            <Tabs.Tab value="live" className={TAB_CLASS}>
              <Timer className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden truncate @2xl:inline">{liveCopy.tab}</span>
              <span className="truncate @2xl:hidden">{liveCopy.tabShort}</span>
            </Tabs.Tab>
          </Tabs.List>
        </div>
        <Tabs.Panel value="teacher" className="px-4 py-4 outline-none lg:px-5">
          <RubricTeacherView t={t} rubric={rubric} />
        </Tabs.Panel>
        <Tabs.Panel value="student" className="px-4 py-4 outline-none lg:px-5">
          <RubricStudentView key={rubric.id} t={t} rubric={rubric} />
        </Tabs.Panel>
        <Tabs.Panel value="live" className="px-4 py-4 outline-none lg:px-5">
          <RubricLiveAssessment key={rubric.id} t={t} rubric={rubric} />
        </Tabs.Panel>
      </Tabs.Root>
    </Card>
  );
}
