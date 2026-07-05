"use client"

import { Fragment, useCallback, useEffect, useState } from "react"
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DisputeRow, DisputesStats } from "@/lib/queries"
import { formatDateTime } from "@/lib/mcu-utils"

type FilterTab = "ALL" | "COMPENSATION" | "FREEZE" | "BAN" | "ABUSE"
const FILTERS: FilterTab[] = ["ALL", "COMPENSATION", "FREEZE", "BAN", "ABUSE"]

export function DisputesModule() {
  const [rows, setRows] = useState<DisputeRow[]>([])
  const [stats, setStats] = useState<DisputesStats | null>(null)
  const [filter, setFilter] = useState<FilterTab>("ALL")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = filter !== "ALL" ? `?filter=${filter}` : ""
      const res = await fetch(`/api/mcu/disputes${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load disputes")
      setRows(data.rows ?? [])
      setStats(data.stats ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load disputes")
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border px-5 py-3">
        <h1 className="font-mono text-sm font-semibold uppercase tracking-widest text-foreground">Disputes</h1>
        <p className="font-mono text-[10px] text-muted-foreground">POXY WORLD // Resolution & Enforcement</p>
      </header>

      {stats && (
        <div className="grid shrink-0 grid-cols-1 gap-px border-b border-border bg-border sm:grid-cols-3">
          {[
            { label: "Compensations (month)", value: stats.compensations_this_month },
            { label: "PX given out (month)", value: stats.total_px_given_out.toLocaleString() },
            { label: "Abuse tickets", value: stats.abuse_count },
          ].map((stat) => (
            <div key={stat.label} className="bg-background px-5 py-3">
              <span className="block font-mono text-lg font-semibold tabular-nums text-foreground">{stat.value}</span>
              <span className="block font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="border-b border-border px-5 py-3">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={cn(
                "rounded-[3px] border px-2 py-0.5 font-mono text-[9px] font-semibold tracking-widest transition-colors",
                filter === tab
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground/30",
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-2 font-mono text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="px-5 py-8 text-center font-mono text-xs text-muted-foreground">No disputes found</p>
        ) : (
          <table className="w-full font-mono text-[11px]">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="w-8 px-3 py-2" />
                <th className="px-3 py-2">Player</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Amount / Reason</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Admin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const expanded = expandedId === row.id
                return (
                  <Fragment key={row.id}>
                    <tr
                      className="cursor-pointer border-b border-border/50 transition-colors hover:bg-sidebar-accent/30"
                      onClick={() => setExpandedId(expanded ? null : row.id)}
                    >
                      <td className="px-3 py-2 text-muted-foreground">
                        {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      </td>
                      <td className="px-3 py-2 text-foreground">@{row.player_username ?? row.player_id.slice(0, 8)}</td>
                      <td className="px-3 py-2">
                        <TypeBadge type={row.type} />
                      </td>
                      <td className="max-w-[240px] truncate px-3 py-2 text-muted-foreground">{row.amount_or_reason}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.status.replace(/_/g, " ")}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDateTime(row.created_at)}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.admin_username ? `@${row.admin_username}` : "—"}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-b border-border/50 bg-background/60">
                        <td colSpan={7} className="px-5 py-3">
                          <pre className="overflow-x-auto rounded-md border border-border bg-black/40 p-3 font-mono text-[10px] text-zinc-300">
                            {JSON.stringify(row.payload, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function TypeBadge({ type }: { type: DisputeRow["type"] }) {
  const styles: Record<DisputeRow["type"], string> = {
    COMPENSATION: "border-amber-500/40 bg-amber-500/10 text-amber-400",
    FREEZE: "border-blue-500/40 bg-blue-500/10 text-blue-400",
    BAN: "border-red-500/40 bg-red-500/10 text-red-400",
    ABUSE: "border-purple-500/40 bg-purple-500/10 text-purple-400",
  }

  return (
    <span
      className={cn(
        "inline-flex rounded-[3px] border px-1.5 py-0.5 text-[9px] font-semibold tracking-widest",
        styles[type],
      )}
    >
      {type}
    </span>
  )
}
