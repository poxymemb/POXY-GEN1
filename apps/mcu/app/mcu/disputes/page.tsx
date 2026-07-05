import { WorkspaceShell } from "@/components/workspace-shell"
import { DisputesModule } from "@/components/mcu/disputes-module"

export default function DisputesPage() {
  return (
    <WorkspaceShell active="disputes">
      <DisputesModule />
    </WorkspaceShell>
  )
}
