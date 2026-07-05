import { WorkspaceShell } from "@/components/workspace-shell"
import { ChangelogModule } from "@/components/mcu/changelog"

export default function ChangelogPage() {
  return (
    <WorkspaceShell active="changelog">
      <ChangelogModule />
    </WorkspaceShell>
  )
}
