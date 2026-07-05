"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { EconomyHealth } from "@/lib/queries"
import { formatDateTime, supplyBarColor, tierColorClass } from "@/lib/mcu-utils"

const TIER_ORDER = ["common", "uncommon", "rare", "epic", "legendary", "mythic", "secret"]

export function EconomyHealthModule() {
  const [economy, setEconomy] = useState<EconomyHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/mcu/economy")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load economy")
      setEconomy(data.economy)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load economy")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const caps = [...(economy?.gen1_caps ?? [])].sort(
    (a, b) => TIER_ORDER.indexOf(a.poxy_tier) - TIER_ORDER.indexOf(b.poxy_tier),
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border px-5 py-3">
        <h1 className="font-mono text-sm font-semibold uppercase tracking-widest text-foreground">Economy Health</h1>
        <p className="font-mono text-[10px] text-muted-foreground">POXY WORLD // Supply & Circulation</p>
      </header>

      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-2 font-mono text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 scrollbar-thin">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : economy ? (
          <div className="mx-auto max-w-4xl space-y-6">
            <section className="rounded-lg border border-border bg-background/40 p-5">
              <h2 className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Gen 1 Supply by Tier
              </h2>
              <div className="space-y-3">
                {caps.map((tier) => {
                  const pct = tier.cap > 0 ? Math.round((tier.minted / tier.cap) * 100) : 0
                  return (
                    <div key={tier.poxy_tier}>
                      <div className="mb-1 flex items-center justify-between font-mono text-[11px]">
                        <span className={cn("uppercase", tierColorClass(tier.poxy_tier))}>{tier.poxy_tier}</span>
                        <span className="text-muted-foreground">
                          {tier.minted.toLocaleString()} / {tier.cap.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
                        <div
                          className={cn("h-full rounded-full transition-all", supplyBarColor(pct))}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="rounded-lg border border-border bg-background/40 p-5">
              <h2 className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                PX Economy
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "PX in circulation", value: economy.px_circulation.toLocaleString() },
                  { label: "Burn events", value: economy.total_burn_events.toLocaleString() },
                  { label: "PX purchased", value: economy.total_px_purchased.toLocaleString() },
                  {
                    label: "PC circulation",
                    value: Number(economy.supply_overview?.total_pc_circulation ?? 0).toLocaleString(),
                  },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-md border border-border bg-background/60 px-3 py-3">
                    <span className="block font-mono text-lg font-semibold tabular-nums text-foreground">
                      {stat.value}
                    </span>
                    <span className="block font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-border bg-background/40 p-5">
              <h2 className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Marketplace
              </h2>
              <div className="flex flex-wrap gap-6 font-mono text-[11px]">
                <span>
                  Active listings: <strong>{economy.marketplace.active_listings}</strong>
                </span>
                <span>
                  Total volume (sold): <strong>{economy.marketplace.total_volume.toLocaleString()} PC</strong>
                </span>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-background/40 p-5">
              <h2 className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Recent Ledger Events
              </h2>
              {economy.recent_ledger.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">No ledger events</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full font-mono text-[11px]">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-2 pr-3">Seq</th>
                        <th className="pb-2 pr-3">Type</th>
                        <th className="pb-2 pr-3">Time</th>
                        <th className="pb-2">Hash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {economy.recent_ledger.map((event) => (
                        <tr key={event.id} className="border-b border-border/50">
                          <td className="py-2 pr-3 tabular-nums">{event.seq ?? "—"}</td>
                          <td className="py-2 pr-3">{event.event_type}</td>
                          <td className="py-2 pr-3">{formatDateTime(event.event_timestamp)}</td>
                          <td className="max-w-[180px] truncate py-2 text-muted-foreground">{event.event_hash}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  )
}
