import { WorkspaceShell } from "@/components/workspace-shell"
import { MarketingAnalyticsModule } from "@/components/mcu/marketing-analytics"

export default function MarketingAnalyticsPage() {
  return (
    <WorkspaceShell active="analytics">
      <MarketingAnalyticsModule />
    </WorkspaceShell>
  )
}
