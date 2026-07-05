import { WorkspaceShell } from "@/components/workspace-shell"
import { TaskManagerModule } from "@/components/mcu/task-manager"

export default function TasksPage() {
  return (
    <WorkspaceShell active="tasks">
      <TaskManagerModule />
    </WorkspaceShell>
  )
}
