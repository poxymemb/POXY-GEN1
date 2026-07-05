import { WorkspaceShell } from "@/components/workspace-shell"
import { AuditLogModule } from "@/components/mcu/audit-log-panel"

export default function AuditPage() {
  return (
    <WorkspaceShell active="auditlog">
      <AuditLogModule />
    </WorkspaceShell>
  )
}
