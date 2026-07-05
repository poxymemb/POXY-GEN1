"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import type { AuditLogEntry } from "@/lib/queries"
import { formatDateTime } from "@/lib/mcu-utils"

export function AuditLogModule() {
  const [rows, setRows] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/mcu/audit")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load audit log")
      setRows(data.rows ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit log")
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
        <h1 className="font-mono text-sm font-semibold uppercase tracking-widest text-foreground">Audit Log</h1>
        <p className="font-mono text-[10px] text-muted-foreground">POXY WORLD // Admin Actions (last 100)</p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : error ? (
          <p className="px-5 py-4 font-mono text-xs text-destructive">{error}</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">No audit entries</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 border-b border-border bg-background/95 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-5 py-2 font-medium">Admin</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Reason</th>
                <th className="px-5 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60 hover:bg-sidebar-accent/30">
                  <td className="px-5 py-2.5 font-mono text-foreground">
                    @{row.profiles?.username ?? "unknown"}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{row.action_type}</td>
                  <td className="max-w-md truncate px-3 py-2.5 text-foreground">{row.reason || "—"}</td>
                  <td className="whitespace-nowrap px-5 py-2.5 font-mono text-muted-foreground">
                    {formatDateTime(row.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
