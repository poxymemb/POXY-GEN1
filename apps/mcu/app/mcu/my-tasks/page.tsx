import { WorkspaceShell } from "@/components/workspace-shell"
import { MyTasksModule } from "@/components/mcu/my-tasks"

export default function MyTasksPage() {
  return (
    <WorkspaceShell active="mytasks">
      <MyTasksModule />
    </WorkspaceShell>
  )
}
