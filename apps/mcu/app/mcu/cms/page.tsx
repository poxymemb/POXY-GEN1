import { WorkspaceShell } from "@/components/workspace-shell"
import { CmsModule } from "@/components/mcu/cms-panel"

export default function CmsPage() {
  return (
    <WorkspaceShell active="cms">
      <CmsModule />
    </WorkspaceShell>
  )
}
