"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ANALYTICS_PERIODS, type TrafficRow } from "@/lib/mcu-marketing"

type RegRow = { date: string; count: number }

type AnalyticsPayload = {
  period: number
  registrations: RegRow[]
  traffic: TrafficRow[]
  subscriberCount: number
  campaigns: Array<{ id: string; name: string }>
}

function RegistrationsChart({ data }: { data: RegRow[] }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  const w = 600
  const h = 160
  const padX = 20
  const padY = 16
  const chartH = h - padY - 24
  const barW = Math.max(4, (w - padX * 2) / Math.max(data.length, 1) - 2)

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full">
      {data.map((row, i) => {
        const bh = Math.round((row.count / max) * chartH)
        const x = padX + i * ((w - padX * 2) / data.length)
        const y = h - padY - bh
        return (
          <rect
            key={row.date}
            x={x}
            y={y}
            width={barW}
            height={bh}
            fill="rgba(245,158,11,0.75)"
            rx={2}
          />
        )
      })}
    </svg>
  )
}

export function MarketingAnalyticsModule() {
  const [period, setPeriod] = useState<(typeof ANALYTICS_PERIODS)[number]>(7)
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [trafficForm, setTrafficForm] = useState({
    source: "",
    visits: 0,
    campaignId: "",
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/mcu/marketing/analytics?period=${period}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to load analytics")
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    void load()
  }, [load])

  const totalRegs = useMemo(
    () => (data?.registrations ?? []).reduce((sum, r) => sum + r.count, 0),
    [data],
  )

  async function handleAddDataPoint() {
    if (!trafficForm.source.trim() || trafficForm.visits <= 0 || !trafficForm.campaignId) {
      setError("Source, visits, and campaign required")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/mcu/marketing/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "traffic",
          source: trafficForm.source.trim(),
          visits: trafficForm.visits,
          campaignId: trafficForm.campaignId,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to add data point")
      setShowAdd(false)
      setTrafficForm({ source: "", visits: 0, campaignId: "" })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add data point")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="shrink-0 border-b border-zinc-800/80 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-mono text-sm font-semibold tracking-widest">ANALYTICS</h1>
            <p className="font-mono text-[10px] text-muted-foreground">
              Registrations, traffic & subscribers
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-zinc-700 bg-transparent font-mono text-[10px]"
            onClick={() => setShowAdd(true)}
          >
            + Add data point
          </Button>
        </div>
        <div className="mt-3 flex gap-1">
          {ANALYTICS_PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-md border px-2 py-1 font-mono text-[9px]",
                period === p
                  ? "border-foreground bg-foreground text-background"
                  : "border-zinc-700 text-muted-foreground",
              )}
            >
              {p}d
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-[11px] text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-4 p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <>
            <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-4">
              <h2 className="mb-2 font-mono text-[10px] font-semibold tracking-widest text-muted-foreground">
                NEW REGISTRATIONS
              </h2>
              <RegistrationsChart data={data.registrations} />
              <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                {totalRegs} registrations in last {period}d (from profiles.created_at)
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-4">
                <h2 className="mb-3 font-mono text-[10px] font-semibold tracking-widest text-muted-foreground">
                  TRAFFIC SOURCES
                </h2>
                {data.traffic.length ? (
                  <div className="space-y-2">
                    {data.traffic.map((row, i) => (
                      <div key={`${row.source}-${i}`} className="flex items-center gap-2">
                        <span className="w-24 truncate font-mono text-[10px] text-foreground">
                          {row.source}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full bg-amber-500/70"
                            style={{
                              width: `${Math.round((row.visits / Math.max(...data.traffic.map((t) => t.visits), 1)) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="w-10 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
                          {row.visits}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-[10px] text-muted-foreground">
                    No traffic data in campaign result_notes
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-4">
                <h2 className="mb-2 font-mono text-[10px] font-semibold tracking-widest text-muted-foreground">
                  EMAIL SUBSCRIBERS
                </h2>
                <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">
                  {data.subscriberCount.toLocaleString()}
                </p>
                <p className="mt-1 font-mono text-[9px] text-muted-foreground">
                  landing / email_subscribers table
                </p>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-950 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-mono text-xs font-semibold tracking-widest">ADD TRAFFIC DATA</h3>
              <button type="button" onClick={() => setShowAdd(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={trafficForm.source}
                onChange={(e) => setTrafficForm((p) => ({ ...p, source: e.target.value }))}
                placeholder="Traffic source"
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              />
              <input
                type="number"
                value={trafficForm.visits || ""}
                onChange={(e) =>
                  setTrafficForm((p) => ({ ...p, visits: parseInt(e.target.value, 10) || 0 }))
                }
                placeholder="Visits"
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              />
              <select
                value={trafficForm.campaignId}
                onChange={(e) => setTrafficForm((p) => ({ ...p, campaignId: e.target.value }))}
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              >
                <option value="">Select campaign</option>
                {(data?.campaigns ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                className="w-full font-mono text-[10px]"
                disabled={saving}
                onClick={() => void handleAddDataPoint()}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save data point"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
