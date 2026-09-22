import { AppShell } from "@/components/layout/app-shell";
import { QuizGeneratorWorkspace } from "@/components/features/quiz-generator/quiz-generator-workspace";

export default function QuizGeneratorPage() {
  return (
    <AppShell>
      <QuizGeneratorWorkspace />
    </AppShell>
  );
}
