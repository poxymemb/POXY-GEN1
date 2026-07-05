"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { AlertRow } from "@/lib/queries"
import { formatDateTime } from "@/lib/mcu-utils"

const SEVERITY_STYLES: Record<string, string> = {
  critical: "border-red-500/40 bg-red-500/10 text-red-400",
  high: "border-orange-500/40 bg-orange-500/10 text-orange-400",
  medium: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
  info: "border-blue-500/40 bg-blue-500/10 text-blue-400",
}

export function AlertsModule() {
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/mcu/alerts")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load alerts")
      setAlerts(data.alerts ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <div>
          <h1 className="font-mono text-sm font-semibold uppercase tracking-widest text-foreground">Alerts</h1>
          <p className="font-mono text-[10px] text-muted-foreground">POXY WORLD // Active Signals</p>
        </div>
        <Button variant="outline" size="xs" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : error ? (
          <p className="font-mono text-xs text-destructive">{error}</p>
        ) : alerts.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No alerts</p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert) => (
              <li
                key={alert.alert_key}
                className={cn(
                  "rounded-lg border px-4 py-3",
                  SEVERITY_STYLES[alert.severity] ?? "border-border bg-background/40 text-foreground",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-widest">
                    {alert.alert_type}
                  </span>
                  <span className="font-mono text-[9px] text-muted-foreground">{alert.severity}</span>
                  {alert.username && (
                    <span className="font-mono text-[10px] text-muted-foreground">@{alert.username}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-foreground">{alert.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
