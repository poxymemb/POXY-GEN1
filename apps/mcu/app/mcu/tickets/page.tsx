import { Suspense } from "react"
import { WorkspaceShell } from "@/components/workspace-shell"
import { SupportTicketsModule } from "@/components/mcu/support-tickets"

export default function SupportTicketsPage() {
  return (
    <WorkspaceShell active="tickets">
      <SupportTicketsModule />
    </WorkspaceShell>
  )
}
