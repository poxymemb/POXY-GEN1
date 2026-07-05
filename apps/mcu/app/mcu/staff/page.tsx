import { WorkspaceShell } from "@/components/workspace-shell"
import { StaffProfilesModule } from "@/components/mcu/staff-profiles"

export default function StaffPage() {
  return (
    <WorkspaceShell active="staff">
      <StaffProfilesModule />
    </WorkspaceShell>
  )
}
