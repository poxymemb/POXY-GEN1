"use client"

import { useEffect, useState } from "react"
import { Search, Pause, Play, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { logs as mockLogs, type LogEntry, type LogSeverity } from "@/lib/data"
import { type AuditLogEntry } from "@/lib/queries"
import { SeverityBadge } from "@/components/badges"

const severities: LogSeverity[] = ["DEBUG", "INFO", "WARNING", "CRITICAL"]
const ranges = ["5m", "1h", "6h", "24h", "7d"]

// Tiny inline activity histogram (severity counts per bucket) — no external lib needed.
const histogram = [3, 5, 2, 8, 6, 4, 9, 7, 5, 11, 8, 6, 10, 7, 4, 9, 12, 8, 5, 7, 9, 6, 8, 14]

function mapActionSeverity(actionType: string): LogSeverity {
  switch (actionType) {
    case "freeze":
    case "unfreeze":
      return "CRITICAL"
    case "compensate_pc":
    case "grant_asset":
    case "grant_badge":
      return "WARNING"
    case "note":
      return "DEBUG"
    default:
      return "INFO"
  }
}

function mapAuditEntry(entry: AuditLogEntry): LogEntry {
  const actorName = entry.profiles?.username ?? "system"
  return {
    id: entry.id,
    ts: entry.created_at,
    severity: mapActionSeverity(entry.action_type),
    source: entry.action_type,
    actor: actorName.startsWith("@") ? actorName : `@${actorName}`,
    message: entry.reason || entry.action_type.replace(/_/g, " "),
    tenant: "PX",
    payload: {
      ...entry.payload,
      target_user_id: entry.target_user_id,
      action_type: entry.action_type,
      reason: entry.reason,
    },
  }
}

async function fetchLogs(): Promise<AuditLogEntry[] | null> {
  const res = await fetch("/api/nullspace/logs")
  if (!res.ok) return null
  const data = (await res.json()) as { logs?: AuditLogEntry[] }
  return data.logs ?? null
}

export function SecurityLogs() {
  const [isLoading, setIsLoading] = useState(true)
  const [logList, setLogList] = useState<LogEntry[]>(mockLogs)
  const [active, setActive] = useState<Set<LogSeverity>>(new Set(severities))
  const [query, setQuery] = useState("")
  const [range, setRange] = useState("1h")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [live, setLive] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      try {
        const entries = await fetchLogs()
        if (cancelled) return

        if (!entries || entries.length === 0) {
          setLogList(mockLogs)
          setExpanded(mockLogs[0]?.id ?? null)
          return
        }

        const mapped = entries.map(mapAuditEntry)
        setLogList(mapped)
        setExpanded(mapped[0]?.id ?? null)
      } catch {
        if (!cancelled) {
          setLogList(mockLogs)
          setExpanded(mockLogs[0]?.id ?? null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  function toggleSeverity(s: LogSeverity) {
    setActive((prev) => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  const filtered = logList.filter((l) => {
    if (!active.has(l.severity)) return false
    if (!query) return true
    const q = query.toLowerCase()
    return (
      l.message.toLowerCase().includes(q) ||
      l.source.toLowerCase().includes(q) ||
      l.actor.toLowerCase().includes(q) ||
      l.id.toLowerCase().includes(q)
    )
  })

  const maxBar = Math.max(...histogram)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Sticky top bar */}
      <div className="border-b border-border bg-background">
        <div className="flex items-center gap-3 px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              Cross-Platform Activity & Security Logs
            </h1>
            <p className="font-mono text-[11px] text-muted-foreground">
              System-wide mutations • auth hooks • API requests
            </p>
          </div>
          <button
            onClick={() => setLive((v) => !v)}
            disabled={isLoading}
            className={cn(
              "ml-auto flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors disabled:opacity-50",
              live
                ? "border-success/40 bg-success/10 text-success"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {live ? <Pause className="size-3" /> : <Play className="size-3" />}
            {live ? "Streaming" : "Paused"}
          </button>
        </div>

        {/* Time-range histogram */}
        <div className="flex items-end gap-3 border-t border-border px-4 py-2.5">
          <div className="flex h-10 flex-1 items-end gap-0.5">
            {histogram.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-[1px] bg-accent/40 transition-colors hover:bg-accent"
                style={{ height: `${(v / maxBar) * 100}%` }}
                title={`bucket ${i + 1}: ${v} events`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            {ranges.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                disabled={isLoading}
                className={cn(
                  "rounded-sm border px-2 py-1 font-mono text-[10px] transition-colors disabled:opacity-50",
                  range === r
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Severity filters + search */}
        <div className="flex items-center gap-2 border-t border-border px-4 py-2">
          <div className="flex items-center gap-1">
            {severities.map((s) => (
              <button
                key={s}
                onClick={() => toggleSeverity(s)}
                disabled={isLoading}
                className={cn(
                  "rounded-sm border px-2 py-1 font-mono text-[10px] font-semibold tracking-widest transition-all disabled:opacity-50",
                  active.has(s)
                    ? severityActive[s]
                    : "border-border text-muted-foreground/50 hover:text-muted-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-72 max-w-full">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="grep logs…"
              disabled={isLoading}
              className="h-8 w-full rounded-sm border border-border bg-card pl-8 pr-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Streaming feed */}
      <div className="min-h-0 flex-1 overflow-auto bg-background scrollbar-thin">
        {isLoading ? (
          <ul className="divide-y divide-border/60">
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2">
                <div className="size-3.5 animate-pulse rounded-sm bg-muted" />
                <div className="h-3 w-16 animate-pulse rounded-sm bg-muted/70" />
                <div className="h-4 w-14 animate-pulse rounded-sm bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded-sm bg-muted/70" />
                <div className="h-3 flex-1 animate-pulse rounded-sm bg-muted" />
                <div className="h-3 w-16 animate-pulse rounded-sm bg-muted/70" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((log) => (
              <LogRow
                key={log.id}
                log={log}
                expanded={expanded === log.id}
                onToggle={() => setExpanded((cur) => (cur === log.id ? null : log.id))}
              />
            ))}
          </ul>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="p-8 text-center font-mono text-xs text-muted-foreground">
            No log entries match the active severity filters.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border bg-card px-4 py-1.5 font-mono text-[10px] text-muted-foreground">
        <span>
          {isLoading ? "— entries" : `${filtered.length} entries`} • range {range}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full", live ? "animate-pulse bg-success" : "bg-muted-foreground")} />
          {live ? "TAIL -F" : "BUFFER FROZEN"}
        </span>
      </div>
    </div>
  )
}

const severityActive: Record<LogSeverity, string> = {
  DEBUG: "border-border bg-muted text-foreground",
  INFO: "border-info/40 bg-info/10 text-info",
  WARNING: "border-warning/40 bg-warning/10 text-warning",
  CRITICAL: "border-destructive/50 bg-destructive/10 text-destructive",
}

function LogRow({
  log,
  expanded,
  onToggle,
}: {
  log: LogEntry
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <li className={cn(expanded && "bg-card")}>
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-2 text-left font-mono text-xs transition-colors hover:bg-secondary/40"
      >
        <ChevronRight
          className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")}
        />
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {log.ts.slice(11, 23)}
        </span>
        <span className="shrink-0">
          <SeverityBadge severity={log.severity} />
        </span>
        <span className="shrink-0 text-accent">{log.source}</span>
        <span className="truncate text-foreground/90">{log.message}</span>
        <span className="ml-auto shrink-0 text-muted-foreground">{log.actor}</span>
        <span className="hidden shrink-0 rounded-[3px] border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
          {log.tenant}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-border px-4 py-3 pl-11">
          <div className="mb-2 flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
            <span>ID: {log.id}</span>
            <span>•</span>
            <span>{log.ts}</span>
          </div>
          <pre className="overflow-x-auto rounded-sm border border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-foreground/90 scrollbar-thin">
            {formatJson(log.payload)}
          </pre>
        </div>
      )}
    </li>
  )
}

function formatJson(obj: Record<string, unknown>) {
  const lines = Object.entries(obj).map(([k, v]) => {
    const value = typeof v === "string" ? `"${v}"` : String(v)
    return `  "${k}": ${value},`
  })
  return `{\n${lines.join("\n")}\n}`
}
