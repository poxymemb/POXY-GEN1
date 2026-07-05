import { GlobalSidebar } from "@/components/global-sidebar"
import { WorkspaceProvider } from "@/components/workspace-context"

export function WorkspaceShell({
  children,
}: {
  children: React.ReactNode
  /** Accepted for call-site clarity; active route is derived from the pathname. */
  active?: string
}) {
  return (
    <WorkspaceProvider>
      <div className="dark field-texture flex h-screen w-full overflow-hidden text-foreground">
        <GlobalSidebar />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </WorkspaceProvider>
  )
}
