"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { workspaces, type Workspace, type WorkspaceId } from "@/lib/data"

type WorkspaceContextValue = {
  workspace: Workspace
  workspaces: Workspace[]
  setWorkspace: (id: WorkspaceId) => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [activeId, setActiveId] = useState<WorkspaceId>("nullspace")
  const workspace = workspaces.find((w) => w.id === activeId) ?? workspaces[0]

  useEffect(() => {
    if (pathname.startsWith("/mcu/marketing")) {
      setActiveId("marketing")
    } else if (
      pathname === "/mcu" ||
      pathname.startsWith("/mcu/tickets") ||
      pathname.startsWith("/mcu/dossier") ||
      pathname.startsWith("/mcu/rng") ||
      pathname.startsWith("/mcu/disputes") ||
      pathname.startsWith("/mcu/economy") ||
      pathname.startsWith("/mcu/telemetry") ||
      pathname.startsWith("/mcu/alerts") ||
      pathname.startsWith("/mcu/audit") ||
      pathname.startsWith("/mcu/account-ops") ||
      pathname.startsWith("/mcu/user-matrix") ||
      pathname.startsWith("/mcu/cms") ||
      pathname.startsWith("/mcu/faq")
    ) {
      setActiveId("poxy")
    } else if (pathname.startsWith("/mcu/")) {
      setActiveId("nullspace")
    }
  }, [pathname])

  return (
    <WorkspaceContext.Provider
      value={{ workspace, workspaces, setWorkspace: setActiveId }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider")
  return ctx
}
