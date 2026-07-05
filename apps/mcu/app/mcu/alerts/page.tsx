import { WorkspaceShell } from "@/components/workspace-shell"
import { AlertsModule } from "@/components/mcu/alerts-panel"

export default function AlertsPage() {
  return (
    <WorkspaceShell active="alerts">
      <AlertsModule />
    </WorkspaceShell>
  )
}
