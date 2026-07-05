import { WorkspaceShell } from "@/components/workspace-shell"
import { PersonalDashboardModule } from "@/components/mcu/personal-dashboard"

export default function McuPage() {
  return (
    <WorkspaceShell active="dashboard">
      <PersonalDashboardModule />
    </WorkspaceShell>
  )
}
