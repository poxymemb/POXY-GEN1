import { WorkspaceShell } from "@/components/workspace-shell"
import { MarketingAssetsModule } from "@/components/mcu/marketing-assets"

export default function MarketingAssetsPage() {
  return (
    <WorkspaceShell active="assets">
      <MarketingAssetsModule />
    </WorkspaceShell>
  )
}
