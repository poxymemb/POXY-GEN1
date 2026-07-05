import { WorkspaceShell } from "@/components/workspace-shell"
import { SecurityLogs } from "@/components/security-logs"

export default function LogsPage() {
  return (
    <WorkspaceShell>
      <SecurityLogs />
    </WorkspaceShell>
  )
}
