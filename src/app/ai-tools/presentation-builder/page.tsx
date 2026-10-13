import { AppShell } from "@/components/layout/app-shell";
import { PresentationBuilderWorkspace } from "@/components/features/presentation-builder/presentation-builder-workspace";

export default function PresentationBuilderPage() {
  return (
    <AppShell>
      <PresentationBuilderWorkspace />
    </AppShell>
  );
}
