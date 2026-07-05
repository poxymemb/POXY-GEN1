import { WorkspaceShell } from "@/components/workspace-shell"
import { MessengerModule } from "@/components/mcu/messenger"

export default function MessengerPage() {
  return (
    <WorkspaceShell active="messenger">
      <MessengerModule />
    </WorkspaceShell>
  )
}
