import { AppShell } from "@/components/layout/app-shell";
import { RubricGeneratorWorkspace } from "@/components/features/rubric-generator/rubric-generator-workspace";

export default function RubricGeneratorPage() {
  return (
    <AppShell>
      <RubricGeneratorWorkspace />
    </AppShell>
  );
}
