import { WorkspaceShell } from "@/components/workspace-shell"
import { UserMatrixModule } from "@/components/mcu/user-matrix"

export default function UserMatrixPage() {
  return (
    <WorkspaceShell active="usermatrix">
      <UserMatrixModule />
    </WorkspaceShell>
  )
}
