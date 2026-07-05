"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Search } from "lucide-react"
import type { UserMatrixRow } from "@/lib/queries"
import { formatDateTime } from "@/lib/mcu-utils"

export function UserMatrixModule() {
  const [rows, setRows] = useState<UserMatrixRow[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (q?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      const value = (q ?? search).trim()
      if (value) params.set("search", value)

      const res = await fetch(`/api/mcu/user-matrix?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load users")
      setRows(data.rows ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users")
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    void load("")
  }, [load])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border px-5 py-3">
        <h1 className="font-mono text-sm font-semibold uppercase tracking-widest text-foreground">User Matrix</h1>
        <p className="font-mono text-[10px] text-muted-foreground">POXY WORLD // All Profiles</p>
      </header>

      <div className="border-b border-border px-5 py-3">
        <div className="relative max-w-md">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void load()}
            placeholder="Search username or email…"
            className="w-full rounded-md border border-border bg-background py-2 pl-8 pr-3 font-mono text-xs outline-none focus:border-foreground/30"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : error ? (
          <p className="px-5 py-4 font-mono text-xs text-destructive">{error}</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 border-b border-border bg-background/95 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-5 py-2 font-medium">Username</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">PX</th>
                <th className="px-3 py-2 font-medium">Level</th>
                <th className="px-5 py-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60 hover:bg-sidebar-accent/30">
                  <td className="px-5 py-2.5 font-mono text-foreground">@{row.username ?? "—"}</td>
                  <td className="max-w-[200px] truncate px-3 py-2.5 text-muted-foreground">{row.email ?? "—"}</td>
                  <td className="px-3 py-2.5 tabular-nums text-foreground">{row.px_balance}</td>
                  <td className="px-3 py-2.5 tabular-nums text-foreground">{row.xp_level}</td>
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
