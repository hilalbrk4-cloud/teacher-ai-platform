import { AppShell } from "@/components/layout/app-shell";
import { LessonPlannerWorkspace } from "@/components/features/lesson-planner/lesson-planner-workspace";

export default function LessonPlannerPage() {
  return (
    <AppShell>
      <LessonPlannerWorkspace />
    </AppShell>
  );
}
