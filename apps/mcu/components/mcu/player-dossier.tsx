"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, Search, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { PlayerDossier } from "@/lib/queries"
import { formatDate, formatDateTime } from "@/lib/mcu-utils"

export function PlayerDossierModule() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("user") ?? searchParams.get("q") ?? ""

  const [query, setQuery] = useState(initialQuery)
  const [dossier, setDossier] = useState<PlayerDossier | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDossier = useCallback(async (value?: string) => {
    const q = (value ?? query).trim()
    if (!q) {
      setError("Enter a username or UUID")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/mcu/dossier?user=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Player not found")
      setDossier(data.dossier)
    } catch (err) {
      setDossier(null)
      setError(err instanceof Error ? err.message : "Failed to load dossier")
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    if (initialQuery) void loadDossier(initialQuery)
  }, [initialQuery, loadDossier])

  async function runAction(action: string, extra?: Record<string, unknown>) {
    if (!dossier) return

    const reason = window.prompt("Reason (required):")
    if (!reason?.trim()) return

    setActionLoading(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        user_id: dossier.profile.id,
        action,
        reason: reason.trim(),
        ...extra,
      }

      if (action === "compensate_px") {
        const amountRaw = window.prompt("PX amount to add:", "100")
        const amount = parseFloat(amountRaw ?? "0")
        if (!amount || amount <= 0) return
        payload.amount = amount
      }

      if (action === "ban_tickets") {
        const daysRaw = window.prompt("Ban duration in days:", "7")
        const days = parseInt(daysRaw ?? "7", 10)
        if (!days || days < 1) return
        payload.days = days
      }

      if (action === "freeze") {
        payload.frozen = !dossier.profile.is_frozen
      }

      const res = await fetch("/api/mcu/dossier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Action failed")
      setDossier(data.dossier)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed")
    } finally {
      setActionLoading(false)
    }
  }

  const tiers = Object.entries(dossier?.dna_by_tier ?? {}).sort((a, b) => b[1] - a[1])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border px-5 py-3">
        <h1 className="font-mono text-sm font-semibold uppercase tracking-widest text-foreground">
          Player Dossier
        </h1>
        <p className="font-mono text-[10px] text-muted-foreground">POXY WORLD // Identity & Economy</p>
      </header>

      <div className="border-b border-border px-5 py-4">
        <div className="flex max-w-xl gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void loadDossier()}
              placeholder="Username or UUID…"
              className="w-full rounded-md border border-border bg-background py-2 pl-8 pr-3 font-mono text-xs outline-none focus:border-foreground/30"
            />
          </div>
          <Button onClick={() => void loadDossier()} disabled={loading}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : "Load"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-2 font-mono text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 scrollbar-thin">
        {!dossier && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <User className="mb-3 size-8 text-muted-foreground/40" />
            <p className="font-mono text-xs text-muted-foreground">Search for a player to load their dossier</p>
          </div>
        )}

        {dossier && (
          <div className="mx-auto max-w-4xl space-y-6">
            <section className="rounded-lg border border-border bg-background/40 p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-secondary text-xl font-bold text-muted-foreground">
                  {dossier.profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={dossier.profile.avatar_url}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    (dossier.profile.username ?? "?")[0]?.toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-foreground">@{dossier.profile.username ?? "—"}</h2>
                  <p className="break-all font-mono text-[10px] text-muted-foreground">{dossier.profile.id}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      { label: "Level", value: dossier.profile.xp_level },
                      { label: "PX Balance", value: dossier.profile.px_balance },
                      { label: "PC Balance", value: dossier.profile.balance.toFixed(1) },
                      { label: "Member Since", value: formatDate(dossier.profile.created_at) },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-md border border-border bg-background/60 px-3 py-2 text-center"
                      >
                        <span className="block font-mono text-sm font-semibold tabular-nums text-foreground">
                          {stat.value}
                        </span>
                        <span className="block font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                          {stat.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {dossier.profile.is_frozen && (
                      <span className="rounded-[3px] border border-red-500/40 bg-red-500/10 px-2 py-0.5 font-mono text-[9px] text-red-400">
                        FROZEN
                      </span>
                    )}
                    {dossier.profile.ticket_banned_until &&
                      new Date(dossier.profile.ticket_banned_until) > new Date() && (
                        <span className="rounded-[3px] border border-yellow-500/40 bg-yellow-500/10 px-2 py-0.5 font-mono text-[9px] text-yellow-400">
                          TICKET BANNED
                        </span>
                      )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                <Button
                  variant="destructive"
                  size="xs"
                  disabled={actionLoading}
                  onClick={() => void runAction("freeze")}
                >
                  {dossier.profile.is_frozen ? "Unfreeze account" : "Freeze account"}
                </Button>
                <Button variant="outline" size="xs" disabled={actionLoading} onClick={() => void runAction("ban_tickets")}>
                  Ban tickets
                </Button>
                <Button variant="outline" size="xs" disabled={actionLoading} onClick={() => void runAction("compensate_px")}>
                  Compensate PX
                </Button>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-background/40 p-5">
              <h3 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                DNA Collection
              </h3>
              {tiers.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">No assets</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tiers.map(([tier, count]) => (
                    <span
                      key={tier}
                      className="rounded-md border border-border px-2.5 py-1 font-mono text-[11px] text-foreground"
                    >
                      {tier}: <strong>{count}</strong>
                    </span>
                  ))}
                </div>
              )}
            </section>

            {dossier.pity_counters && (
              <section className="rounded-lg border border-border bg-background/40 p-5">
                <h3 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Pity Counters
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(dossier.pity_counters).map(([key, value]) => (
                    <div key={key} className="flex justify-between font-mono text-[11px]">
                      <span className="text-muted-foreground">{key.replace(/_/g, " ")}</span>
                      <span className="tabular-nums text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {dossier.login_streak && (
              <section className="rounded-lg border border-border bg-background/40 p-5">
                <h3 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Login Streak
                </h3>
                <div className="flex flex-wrap gap-4 font-mono text-[11px]">
                  <span>
                    Current: <strong>{dossier.login_streak.current_streak}</strong>
                  </span>
                  <span>
                    Longest: <strong>{dossier.login_streak.longest_streak}</strong>
                  </span>
                  <span>
                    Total logins: <strong>{dossier.login_streak.total_logins}</strong>
                  </span>
                  <span>Last: {formatDate(dossier.login_streak.last_login_date)}</span>
                </div>
              </section>
            )}

            <section className="rounded-lg border border-border bg-background/40 p-5">
              <h3 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Recent Ledger Events
              </h3>
              {dossier.ledger_events.length === 0 ? (
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
                      {dossier.ledger_events.map((event) => (
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

            <section className="rounded-lg border border-border bg-background/40 p-5">
              <h3 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Compensation History
              </h3>
              {dossier.compensation_history.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">No compensation records</p>
              ) : (
                <ul className="space-y-2">
                  {dossier.compensation_history.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-md border border-border/60 bg-background/60 px-3 py-2 font-mono text-[11px]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="uppercase text-foreground">{entry.action_type.replace(/_/g, " ")}</span>
                        <span className="text-muted-foreground">{formatDateTime(entry.created_at)}</span>
                      </div>
                      <p className="mt-1 text-muted-foreground">{entry.reason}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border border-border bg-background/40 p-5">
              <h3 className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Support Ticket History
              </h3>
              {dossier.support_tickets.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">No support tickets</p>
              ) : (
                <ul className="space-y-2">
                  {dossier.support_tickets.map((ticket) => (
                    <li
                      key={ticket.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-background/60 px-3 py-2 font-mono text-[11px]"
                    >
                      <span className="text-foreground">{ticket.subject}</span>
                      <span
                        className={cn(
                          "rounded-[3px] border px-1.5 py-0.5 text-[9px] uppercase",
                          ticket.status === "closed"
                            ? "border-zinc-600 text-zinc-400"
                            : "border-yellow-500/40 text-yellow-400",
                        )}
                      >
                        {ticket.status.replace("_", " ")}
                        {ticket.is_abuse ? " · abuse" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
