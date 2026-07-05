import { WorkspaceShell } from "@/components/workspace-shell"
import { SystemSettings } from "@/components/system-settings"

export default function SettingsPage() {
  return (
    <WorkspaceShell active="settings">
      <SystemSettings />
    </WorkspaceShell>
  )
}
