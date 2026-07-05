"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, MessageSquare, Ticket, ListChecks, Activity, BellRing, UserCog, Grid3x3 } from "lucide-react"
import type { McuDashboardStats } from "@/lib/queries"

const QUICK_LINKS = [
  { href: "/mcu/tickets", label: "Support Tickets", icon: Ticket },
  { href: "/mcu/tasks", label: "Tasks", icon: ListChecks },
  { href: "/mcu/messenger", label: "Messenger", icon: MessageSquare },
  { href: "/mcu/alerts", label: "Alerts", icon: BellRing },
  { href: "/mcu/telemetry", label: "Telemetry", icon: Activity },
  { href: "/mcu/account-ops", label: "Account Ops", icon: UserCog },
  { href: "/mcu/user-matrix", label: "User Matrix", icon: Grid3x3 },
]

export function PersonalDashboardModule() {
  const [stats, setStats] = useState<McuDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/mcu/dashboard")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load dashboard")
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handle = stats?.username ? `@${stats.username}` : "@staff"

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border px-5 py-3">
        <h1 className="font-mono text-sm font-semibold uppercase tracking-widest text-foreground">
          Staff Dashboard
        </h1>
        <p className="font-mono text-[10px] text-muted-foreground">POXY WORLD // Personal Ops</p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : error ? (
          <p className="font-mono text-xs text-destructive">{error}</p>
        ) : (
          <div className="mx-auto max-w-3xl space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Welcome {handle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Your MCU overview for today.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Open tickets" value={stats?.openTickets ?? 0} href="/mcu/tickets" />
              <StatCard label="My tasks" value={stats?.myTasks ?? 0} href="/mcu/my-tasks" />
              <StatCard label="Unread messages" value={stats?.unreadMessages ?? 0} href="/mcu/messenger" />
            </div>

            <div>
              <h3 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Quick links
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {QUICK_LINKS.map((link) => {
                  const Icon = link.icon
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-4 py-3 transition-colors hover:border-foreground/20 hover:bg-sidebar-accent/40"
                    >
                      <Icon className="size-4 shrink-0 text-accent" />
                      <span className="text-sm text-foreground">{link.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-border bg-zinc-950/40 px-4 py-4 transition-colors hover:border-foreground/20"
    >
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{value}</p>
    </Link>
  )
}
