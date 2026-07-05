"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  // workspace switcher
  ChevronsUpDown,
  Check,
  Terminal,
  // NULLSPACE global
  Network,
  LayoutGrid,
  ScrollText,
  ShieldCheck,
  Settings,
  // POXY personal
  Gauge,
  ListChecks,
  MessageSquare,
  // POXY support
  Scale,
  Ticket,
  UserSearch,
  Dices,
  // POXY tech
  Activity,
  BellRing,
  Coins,
  FileClock,
  HeartPulse,
  // POXY command
  UserCog,
  Grid3x3,
  LayoutTemplate,
  KanbanSquare,
  Megaphone,
  ClipboardCheck,
  StickyNote,
  Monitor,
  Rocket,
  Calendar,
  LineChart,
  Palette,
  Users,
  ClipboardList,
  BookOpen,
  Crown,
  LogOut,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useWorkspace } from "@/components/workspace-context"
import type { NavLeaf } from "@/lib/data"

const iconMap: Record<string, LucideIcon> = {
  Network,
  LayoutGrid,
  ScrollText,
  ShieldCheck,
  Settings,
  Gauge,
  ListChecks,
  MessageSquare,
  Scale,
  Ticket,
  UserSearch,
  Dices,
  Activity,
  BellRing,
  Coins,
  FileClock,
  HeartPulse,
  UserCog,
  Grid3x3,
  LayoutTemplate,
  KanbanSquare,
  Megaphone,
  ClipboardCheck,
  StickyNote,
  Monitor,
  Rocket,
  Calendar,
  LineChart,
  Palette,
  Users,
  ClipboardList,
  BookOpen,
  Crown,
}

export function GlobalSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { workspace, workspaces, setWorkspace } = useWorkspace()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  // Local selection for non-routed (POXY) nav items — instant, no navigation.
  const [activeLeaf, setActiveLeaf] = useState("disputes")

  const isPoxy = workspace.id === "poxy"

  async function handleLogout() {
    setLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push("/")
      router.refresh()
    } catch {
      setLoggingOut(false)
    }
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Workspace switcher */}
      <div className="relative border-b border-border p-2">
        <button
          type="button"
          onClick={() => setSwitcherOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={switcherOpen}
          className="flex w-full items-center gap-2.5 rounded-md border border-border bg-background/60 px-2.5 py-2 text-left transition-colors hover:bg-sidebar-accent"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-primary text-[10px] font-bold text-primary-foreground">
            {workspace.short}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold tracking-tight text-foreground">
              {workspace.name}
            </span>
            <span className="block truncate font-mono text-[10px] text-muted-foreground">
              {workspace.descriptor}
            </span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>

        {switcherOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setSwitcherOpen(false)} />
            <div
              role="listbox"
              className="absolute left-2 right-2 top-full z-50 mt-1 rounded-md border border-border bg-popover p-1 shadow-2xl"
            >
              <p className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Switch Context
              </p>
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  role="option"
                  aria-selected={workspace.id === w.id}
                  onClick={() => {
                    setWorkspace(w.id)
                    setSwitcherOpen(false)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left transition-colors hover:bg-sidebar-accent"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-border text-[10px] font-bold text-foreground">
                    {w.short}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-foreground">{w.name}</span>
                    <span className="block truncate font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                      {w.kind}
                    </span>
                  </span>
                  {workspace.id === w.id && <Check className="size-3.5 shrink-0 text-accent" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Dynamic navigation — mutates instantly with the active workspace */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        {workspace.nav.map((group) => (
          <div key={group.group} className="mb-4">
            <p className="px-2 pb-1.5 font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">
              {group.group}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.id}>
                  <NavRow
                    item={item}
                    routed={!!item.href}
                    active={
                      item.href
                        ? item.href === "/"
                          ? pathname === "/"
                          : pathname.startsWith(item.href)
                        : activeLeaf === item.id
                    }
                    onSelect={() => !item.href && setActiveLeaf(item.id)}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Uplink indicator (POXY) / operator (NULLSPACE) */}
      <div className="border-t border-border p-2">
        {isPoxy ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 py-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-success">
              Uplink Active
            </span>
            <Terminal className="ml-auto size-3.5 text-muted-foreground" />
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-md px-1 py-1">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-[10px] font-bold text-foreground">
              WO
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-foreground">Wren Okafor</span>
              <span className="block truncate font-mono text-[10px] text-muted-foreground">L5 // ROOT</span>
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-2 flex w-full items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        >
          <LogOut className="size-3.5 shrink-0" />
          {loggingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </aside>
  )
}

function NavRow({
  item,
  routed,
  active,
  onSelect,
}: {
  item: NavLeaf
  routed: boolean
  active: boolean
  onSelect: () => void
}) {
  const Icon = iconMap[item.icon] ?? LayoutGrid
  const inner = (
    <span
      className={cn(
        "group relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs transition-colors",
        active
          ? "bg-sidebar-accent font-medium text-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
      )}
    >
      {active && <span className="absolute left-0 h-4 w-0.5 rounded-full bg-accent" />}
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span
          className={cn(
            "shrink-0 rounded-[3px] border px-1 py-px font-mono text-[9px] font-semibold tabular-nums",
            active
              ? "border-border bg-background text-foreground"
              : "border-border/70 text-muted-foreground",
          )}
        >
          {item.badge}
        </span>
      )}
    </span>
  )

  if (routed && item.href) {
    return (
      <Link href={item.href} title={item.label}>
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onSelect} className="w-full text-left" title={item.label}>
      {inner}
    </button>
  )
}
