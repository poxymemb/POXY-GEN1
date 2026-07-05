import { WorkspaceShell } from "@/components/workspace-shell"
import { MyNotesModule } from "@/components/mcu/my-notes"

export default function NotesPage() {
  return (
    <WorkspaceShell active="notes">
      <MyNotesModule />
    </WorkspaceShell>
  )
}
