import { WorkspaceShell } from "@/components/workspace-shell"
import { UpdatesCenterModule } from "@/components/mcu/updates-center"

export default function UpdatesPage() {
  return (
    <WorkspaceShell active="updates">
      <UpdatesCenterModule />
    </WorkspaceShell>
  )
}
