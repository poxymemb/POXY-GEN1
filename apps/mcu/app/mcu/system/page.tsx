import { WorkspaceShell } from "@/components/workspace-shell"
import { SystemHealthModule } from "@/components/mcu/system-health"

export default function SystemHealthPage() {
  return (
    <WorkspaceShell active="system">
      <SystemHealthModule />
    </WorkspaceShell>
  )
}
