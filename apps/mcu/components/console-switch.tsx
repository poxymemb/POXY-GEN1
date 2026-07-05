"use client"

import { useWorkspace } from "@/components/workspace-context"
import { GlobalConsole } from "@/components/global-console"
import { PoxyConsole } from "@/components/poxy-console"

// Renders the operational console for the active workspace. Mutates instantly
// when the context switcher changes the workspace — no navigation required.
export function ConsoleSwitch() {
  const { workspace } = useWorkspace()
  return workspace.id === "poxy" ? <PoxyConsole /> : <GlobalConsole />
}
