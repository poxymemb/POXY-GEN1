import { WorkspaceShell } from "@/components/workspace-shell"
import { RngAuditModule } from "@/components/mcu/rng-audit"

export default function RngAuditPage() {
  return (
    <WorkspaceShell active="rng">
      <RngAuditModule />
    </WorkspaceShell>
  )
}
