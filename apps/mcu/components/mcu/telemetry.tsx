"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import type { TelemetryStats } from "@/lib/queries"

export function TelemetryModule() {
  const [stats, setStats] = useState<TelemetryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/mcu/telemetry")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load telemetry")
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load telemetry")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border px-5 py-3">
        <h1 className="font-mono text-sm font-semibold uppercase tracking-widest text-foreground">
          Telemetry
        </h1>
        <p className="font-mono text-[10px] text-muted-foreground">POXY WORLD // Coming Soon</p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : error ? (
          <p className="font-mono text-xs text-destructive">{error}</p>
        ) : (
          <div className="mx-auto max-w-xl space-y-6">
            <p className="text-lg text-foreground">Telemetry — Coming Soon</p>
            <p className="text-sm text-muted-foreground">
              Full telemetry dashboards are in development. Current snapshot from live data:
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-zinc-950/40 px-4 py-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Profiles
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
                  {stats?.profilesCount.toLocaleString() ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-zinc-950/40 px-4 py-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  User POXY
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
                  {stats?.userPoxyCount.toLocaleString() ?? "—"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
