import { AppShell } from "@/components/layout/app-shell";
import { AiCommandCenter } from "@/components/features/dashboard/ai-command-center";
import { AiSuggestions } from "@/components/features/dashboard/ai-suggestions";
import { ContinueWorking } from "@/components/features/dashboard/continue-working";
import { QuickAiTools } from "@/components/features/dashboard/quick-ai-tools";
import { RecentActivity } from "@/components/features/dashboard/recent-activity";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-5">
        <AiCommandCenter />
        <ContinueWorking />
        <QuickAiTools />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <AiSuggestions />
          <RecentActivity />
        </div>
      </div>
    </AppShell>
  );
}
