import { WorkspaceShell } from "@/components/workspace-shell"
import { MarketingInfluencersModule } from "@/components/mcu/marketing-influencers"

export default function MarketingInfluencersPage() {
  return (
    <WorkspaceShell active="influencers">
      <MarketingInfluencersModule />
    </WorkspaceShell>
  )
}
