import { WorkspaceShell } from "@/components/workspace-shell"
import { HandbookModule } from "@/components/mcu/handbook"

export default function HandbookPage() {
  return (
    <WorkspaceShell active="handbook">
      <HandbookModule />
    </WorkspaceShell>
  )
}
