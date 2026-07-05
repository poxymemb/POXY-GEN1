import { WorkspaceShell } from "@/components/workspace-shell"
import { EconomyHealthModule } from "@/components/mcu/economy-health"

export default function EconomyPage() {
  return (
    <WorkspaceShell active="economy">
      <EconomyHealthModule />
    </WorkspaceShell>
  )
}
