import { WorkspaceShell } from "@/components/workspace-shell"
import { MarketingCampaignsModule } from "@/components/mcu/marketing-campaigns"

export default function MarketingCampaignsPage() {
  return (
    <WorkspaceShell active="campaigns">
      <MarketingCampaignsModule />
    </WorkspaceShell>
  )
}
