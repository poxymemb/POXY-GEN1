import { WorkspaceShell } from "@/components/workspace-shell"
import { AccountOpsModule } from "@/components/mcu/account-ops"

export default function AccountOpsPage() {
  return (
    <WorkspaceShell active="accountops">
      <AccountOpsModule />
    </WorkspaceShell>
  )
}
