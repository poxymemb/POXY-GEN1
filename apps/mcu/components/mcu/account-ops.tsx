"use client"

import { useCallback, useState } from "react"
import { Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PlayerDossier } from "@/lib/queries"
import { formatDate, formatDateTime } from "@/lib/mcu-utils"

export function AccountOpsModule() {
  const [query, setQuery] = useState("")
  const [dossier, setDossier] = useState<PlayerDossier | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPlayer = useCallback(async (value?: string) => {
    const q = (value ?? query).trim()
    if (!q) {
      setError("Enter a username")
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
      setError(err instanceof Error ? err.message : "Failed to load player")
    } finally {
      setLoading(false)
    }
  }, [query])

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border px-5 py-3">
        <h1 className="font-mono text-sm font-semibold uppercase tracking-widest text-foreground">Account Ops</h1>
        <p className="font-mono text-[10px] text-muted-foreground">POXY WORLD // Player Actions</p>
      </header>

      <div className="border-b border-border px-5 py-4">
        <div className="flex max-w-xl gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void loadPlayer()}
              placeholder="Search by username…"
              className="w-full rounded-md border border-border bg-background py-2 pl-8 pr-3 font-mono text-xs outline-none focus:border-foreground/30"
            />
          </div>
          <Button onClick={() => void loadPlayer()} disabled={loading}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : "Search"}
          </Button>
        </div>
        {error && <p className="mt-2 font-mono text-xs text-destructive">{error}</p>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 scrollbar-thin">
        {!dossier ? (
          <p className="text-center text-sm text-muted-foreground">Search for a player to manage their account.</p>
        ) : (
          <div className="mx-auto max-w-xl space-y-6">
            <div className="rounded-lg border border-border bg-zinc-950/40 p-4">
              <h2 className="text-lg font-semibold text-foreground">@{dossier.profile.username ?? "unknown"}</h2>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-mono text-[10px] uppercase text-muted-foreground">PX Balance</dt>
                  <dd className="text-foreground">{dossier.profile.px_balance}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase text-muted-foreground">XP Level</dt>
                  <dd className="text-foreground">{dossier.profile.xp_level}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase text-muted-foreground">Joined</dt>
                  <dd className="text-foreground">{formatDate(dossier.profile.created_at)}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase text-muted-foreground">Status</dt>
                  <dd className="text-foreground">
                    {dossier.profile.is_frozen ? "Frozen" : "Active"}
                    {dossier.profile.ticket_banned_until
                      ? ` · Ticket ban until ${formatDateTime(dossier.profile.ticket_banned_until)}`
                      : ""}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading}
                onClick={() => void runAction("freeze")}
              >
                {dossier.profile.is_frozen ? "Unfreeze" : "Freeze"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading}
                onClick={() => void runAction("compensate_px")}
              >
                Compensate PX
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading}
                onClick={() => void runAction("ban_tickets")}
              >
                Ban tickets
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
