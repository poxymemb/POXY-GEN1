import { WorkspaceShell } from "@/components/workspace-shell"
import { MarketingCalendarModule } from "@/components/mcu/marketing-calendar"

export default function MarketingCalendarPage() {
  return (
    <WorkspaceShell active="calendar">
      <MarketingCalendarModule />
    </WorkspaceShell>
  )
}
