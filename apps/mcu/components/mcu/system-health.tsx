"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import type { SystemHealthLogRow } from "@/lib/queries"
import { formatDateTime } from "@/lib/mcu-utils"

type HealthMetrics = {
  checkedAt: string
  supabase: { status: string; latencyMs: number }
  vercel: { status: string; latencyMs: number }
  realtime: { status: string; connections: number }
  storage: {
    buckets: Array<{ id: string; name: string; public: boolean }>
    bucketCount: number
  }
  metrics: { rpcCallsToday: number; errorRate1h: number }
  errors: string[]
  recentLogs: SystemHealthLogRow[]
}

function StatusLine({
  label,
  status,
  meta,
}: {
  label: string
  status: string
  meta: string
}) {
  const online = status === "online"
  return (
    <div className="flex items-center gap-3 rounded-md border border-zinc-800/60 bg-zinc-950/40 px-4 py-3">
      <span
        className={cn(
          "text-lg leading-none",
          online ? "text-emerald-400" : "text-red-400",
        )}
      >
        ●
      </span>
      <div className="flex-1">
        <div className="font-mono text-[11px] font-semibold text-foreground">
          {label} {online ? "ONLINE" : status.toUpperCase()}
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">{meta}</div>
      </div>
    </div>
  )
}

export function SystemHealthModule() {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const runCheck = useCallback(async (manual = false) => {
    setChecking(true)
    if (!manual) setLoading(true)
    setError(null)

    try {
      const supabase = getSupabase()
      const channels = supabase.realtime.channels
      let connectionCount = 1
      if (Array.isArray(channels)) {
        connectionCount = Math.max(channels.length, 1)
      } else if (channels && typeof channels === "object") {
        connectionCount = Math.max(Object.keys(channels).length, 1)
      }

      const res = await fetch("/api/mcu/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realtimeConnections: connectionCount }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Health check failed")
      setMetrics(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Health check failed")
    } finally {
      setChecking(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void runCheck(false)
    intervalRef.current = setInterval(() => {
      void runCheck(false)
    }, 60_000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [runCheck])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="shrink-0 border-b border-zinc-800/80 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-mono text-sm font-semibold tracking-widest text-foreground">
              SYSTEM HEALTH
            </h1>
            <p className="font-mono text-[10px] text-muted-foreground">
              Live infrastructure status · auto-refresh 60s
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-zinc-700 bg-transparent font-mono text-[10px]"
            disabled={checking}
            onClick={() => void runCheck(true)}
          >
            {checking ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
            )}
            Manual Refresh
          </Button>
        </div>
        {metrics?.checkedAt && (
          <p className="mt-1 font-mono text-[9px] text-zinc-600">
            Last checked: {formatDateTime(metrics.checkedAt)}
          </p>
        )}
      </header>

      {error && (
        <div className="mx-4 mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-[11px] text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-4 p-4">
        {loading && !metrics ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : metrics ? (
          <>
            <div className="grid gap-2 md:grid-cols-1 lg:grid-cols-3">
              <StatusLine
                label="Supabase DB"
                status={metrics.supabase.status}
                meta={`${metrics.supabase.latencyMs}ms`}
              />
              <StatusLine
                label="Vercel"
                status={metrics.vercel.status}
                meta={`${metrics.vercel.latencyMs}ms · /api/health`}
              />
              <StatusLine
                label="Realtime"
                status={metrics.realtime.status}
                meta={`${metrics.realtime.connections} active subscriptions`}
              />
            </div>

            <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-4">
              <h2 className="mb-3 font-mono text-[10px] font-semibold tracking-widest text-muted-foreground">
                STORAGE BREAKDOWN
              </h2>
              {metrics.storage.buckets.length ? (
                <div className="space-y-2">
                  {metrics.storage.buckets.map((bucket) => (
                    <div
                      key={bucket.id}
                      className="flex items-center justify-between rounded-md border border-zinc-800/40 px-3 py-2"
                    >
                      <span className="font-mono text-[11px] text-foreground">{bucket.name}</span>
                      <span className="font-mono text-[9px] text-muted-foreground">
                        {bucket.public ? "public" : "private"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-mono text-[10px] text-muted-foreground">No buckets found</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-4">
                <h2 className="mb-2 font-mono text-[10px] font-semibold tracking-widest text-muted-foreground">
                  METRICS
                </h2>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Health checks today</span>
                    <span className="text-foreground">{metrics.metrics.rpcCallsToday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Error rate (1h)</span>
                    <span className="text-foreground">
                      {(metrics.metrics.errorRate1h * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {metrics.errors.length > 0 && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                  <h2 className="mb-2 font-mono text-[10px] font-semibold tracking-widest text-red-400">
                    SESSION ERRORS
                  </h2>
                  <ul className="space-y-1">
                    {metrics.errors.map((msg) => (
                      <li key={msg} className="font-mono text-[10px] text-red-300">
                        {msg}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-4">
              <h2 className="mb-3 font-mono text-[10px] font-semibold tracking-widest text-muted-foreground">
                RECENT HEALTH LOG (last 10)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full font-mono text-[10px]">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left text-muted-foreground">
                      <th className="pb-2 pr-4">Checked</th>
                      <th className="pb-2 pr-4">DB ms</th>
                      <th className="pb-2 pr-4">Connections</th>
                      <th className="pb-2 pr-4">Storage MB</th>
                      <th className="pb-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.recentLogs.map((row) => (
                      <tr key={row.id} className="border-b border-zinc-900/60">
                        <td className="py-2 pr-4 text-foreground">
                          {formatDateTime(row.checked_at)}
                        </td>
                        <td className="py-2 pr-4 text-foreground">
                          {row.supabase_latency_ms ?? "—"}
                        </td>
                        <td className="py-2 pr-4 text-foreground">
                          {row.active_connections ?? "—"}
                        </td>
                        <td className="py-2 pr-4 text-foreground">
                          {row.storage_used_mb ?? "—"}
                        </td>
                        <td className="max-w-[200px] truncate py-2 text-muted-foreground">
                          {row.notes ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
