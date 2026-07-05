import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { WorkspaceShell } from "@/components/workspace-shell"
import { PlayerDossierModule } from "@/components/mcu/player-dossier"

function DossierFallback() {
  return (
    <div className="flex flex-1 items-center justify-center text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
    </div>
  )
}

export default function PlayerDossierPage() {
  return (
    <WorkspaceShell active="dossier">
      <Suspense fallback={<DossierFallback />}>
        <PlayerDossierModule />
      </Suspense>
    </WorkspaceShell>
  )
}
