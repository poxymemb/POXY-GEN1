import { WorkspaceShell } from "@/components/workspace-shell"
import { TelemetryModule } from "@/components/mcu/telemetry"

export default function TelemetryPage() {
  return (
    <WorkspaceShell active="telemetry">
      <TelemetryModule />
    </WorkspaceShell>
  )
}
