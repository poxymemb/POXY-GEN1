import { WorkspaceShell } from "@/components/workspace-shell"
import { FaqManagerModule } from "@/components/mcu/faq-manager"

export default function FaqPage() {
  return (
    <WorkspaceShell active="faq">
      <FaqManagerModule />
    </WorkspaceShell>
  )
}
