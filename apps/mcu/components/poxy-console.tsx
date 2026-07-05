"use client"

import { useEffect, useState } from "react"
import {
  Search,
  Filter,
  Snowflake,
  ShieldAlert,
  CheckCircle2,
  ArrowUpRight,
  MessageSquareWarning,
  Dices,
  Flag,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  disputes as mockDisputes,
  players as mockPlayers,
  fallbackPlayer,
  poxyMetrics as mockPoxyMetrics,
  type Dispute,
  type DisputeStatus,
  type DisputePriority,
  type Player,
} from "@/lib/data"
import {
  getDisputes,
  getPlayers,
  getPoxyMetrics,
  type DisputeTicket,
  type PlayerProfile,
  type PoxyMetrics,
} from "@/lib/queries"

const statusStyle: Record<DisputeStatus, string> = {
  OPEN: "text-foreground",
  ESCALATED: "text-destructive",
  PENDING: "text-warning",
  RESOLVED: "text-muted-foreground",
}

const statusDot: Record<DisputeStatus, string> = {
  OPEN: "bg-foreground",
  ESCALATED: "bg-destructive",
  PENDING: "bg-warning",
  RESOLVED: "bg-muted-foreground",
}

const priorityStyle: Record<DisputePriority, string> = {
  P0: "border-destructive/40 text-destructive bg-destructive/10",
  P1: "border-warning/40 text-warning bg-warning/10",
  P2: "border-border text-muted-foreground",
  P3: "border-border text-muted-foreground/70",
}

type MetricCard = { label: string; value: string }

type ConsolePayload = {
  tickets: Awaited<ReturnType<typeof getDisputes>>
  players: Awaited<ReturnType<typeof getPlayers>>
  metrics: Awaited<ReturnType<typeof getPoxyMetrics>>
}

function mapTicketStatus(status: DisputeTicket["status"]): DisputeStatus {
  switch (status) {
    case "open":
      return "OPEN"
    case "in_progress":
      return "ESCALATED"
    case "closed":
      return "RESOLVED"
    default:
      return "OPEN"
  }
}

function formatAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return "now"
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ${String(mins % 60).padStart(2, "0")}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${String(hours % 24).padStart(2, "0")}h`
}

function tierFromLevel(level: number): Player["tier"] {
  if (level >= 50) return "WHALE"
  if (level >= 30) return "VIP"
  if (level >= 15) return "GOLD"
  if (level >= 5) return "SILVER"
  return "BRONZE"
}

function mapTicketToDispute(ticket: DisputeTicket): Dispute {
  const username = ticket.profiles?.username ?? "unknown_player"
  return {
    id: ticket.id,
    player: username,
    playerId: ticket.user_id,
    category: ticket.subject,
    amount: ticket.profiles ? `${ticket.profiles.px_balance.toLocaleString()} PC` : "—",
    priority: ticket.status === "in_progress" ? "P0" : ticket.status === "open" ? "P2" : "P3",
    status: mapTicketStatus(ticket.status),
    age: formatAge(ticket.created_at),
    assignee: ticket.assigned_to ? `@${ticket.assigned_to.slice(0, 8)}` : "@unassigned",
    game: "—",
    flags: 0,
  }
}

function mapProfileToPlayer(profile: PlayerProfile): Player {
  return {
    id: profile.id,
    handle: profile.username ?? "unknown_player",
    tier: tierFromLevel(profile.xp_level),
    status: "ACTIVE",
    joined: profile.created_at.slice(0, 10),
    country: "—",
    ltv: `${profile.xp_total.toLocaleString()} XP`,
    balance: `${profile.px_balance.toLocaleString()} PC`,
    deposits: "—",
    withdrawals: "—",
    riskScore: Math.min(100, profile.xp_level * 2),
    kyc: "PENDING",
    lastSession: `Lv ${profile.xp_level}`,
    flags: [],
    recentBets: [],
  }
}

function mapMetrics(metrics: PoxyMetrics | null, disputeList: Dispute[]): MetricCard[] {
  const open = disputeList.filter((d) => d.status === "OPEN").length
  const escalated = disputeList.filter((d) => d.status === "ESCALATED").length
  const resolved = disputeList.filter((d) => d.status === "RESOLVED").length

  if (!metrics) {
    return mockPoxyMetrics
  }

  return [
    { label: "Open", value: String(open) },
    { label: "Escalated", value: String(escalated) },
    { label: "Players", value: String(metrics.total_players) },
    { label: "Resolved 24h", value: String(resolved) },
  ]
}

async function fetchConsoleData(): Promise<ConsolePayload | null> {
  const res = await fetch("/api/poxy/console-data")
  if (!res.ok) return null
  return res.json()
}

export function PoxyConsole() {
  const [isLoading, setIsLoading] = useState(true)
  const [disputeList, setDisputeList] = useState<Dispute[]>(mockDisputes)
  const [playerMap, setPlayerMap] = useState<Record<string, Player>>(mockPlayers)
  const [metrics, setMetrics] = useState<MetricCard[]>(mockPoxyMetrics)
  const [selectedId, setSelectedId] = useState<string>(mockDisputes[0].id)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      try {
        const payload = await fetchConsoleData()
        if (cancelled) return

        if (!payload) {
          setDisputeList(mockDisputes)
          setPlayerMap(mockPlayers)
          setMetrics(mockPoxyMetrics)
          setSelectedId(mockDisputes[0].id)
          return
        }

        const mappedDisputes =
          payload.tickets.length > 0 ? payload.tickets.map(mapTicketToDispute) : mockDisputes

        const mappedPlayers: Record<string, Player> =
          payload.players.length > 0
            ? Object.fromEntries(payload.players.map((p) => [p.id, mapProfileToPlayer(p)]))
            : mockPlayers

        const mappedMetrics = mapMetrics(payload.metrics, mappedDisputes)

        setDisputeList(mappedDisputes)
        setPlayerMap(mappedPlayers)
        setMetrics(mappedMetrics)
        setSelectedId(mappedDisputes[0]?.id ?? mockDisputes[0].id)
      } catch {
        if (!cancelled) {
          setDisputeList(mockDisputes)
          setPlayerMap(mockPlayers)
          setMetrics(mockPoxyMetrics)
          setSelectedId(mockDisputes[0].id)
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

  const filtered = disputeList.filter((d) => {
    const matchesQuery =
      !query ||
      d.player.toLowerCase().includes(query.toLowerCase()) ||
      d.id.includes(query) ||
      d.category.toLowerCase().includes(query.toLowerCase())
    const matchesStatus = statusFilter === "ALL" || d.status === statusFilter
    return matchesQuery && matchesStatus
  })

  const selected = disputeList.find((d) => d.id === selectedId) ?? disputeList[0] ?? mockDisputes[0]
  const player =
    playerMap[selected.playerId] ??
    { ...fallbackPlayer, handle: selected.player, id: selected.playerId, balance: selected.amount }

  return (
    <div className="flex min-h-0 flex-1">
      {/* CENTER PANE — Operational Dispute Matrix */}
      <section className="flex min-w-0 flex-1 flex-col border-r border-border">
        {/* Header / metrics */}
        <div className="flex items-center justify-between gap-4 border-b border-border bg-background/40 px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              Operational Dispute Matrix
            </h1>
            <p className="font-mono text-[11px] text-muted-foreground">
              Support queue scoped to POXY WORLD // gaming ops
            </p>
          </div>
          <div className="hidden items-center gap-4 lg:flex">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="text-right">
                    <div className="mx-auto ml-auto h-4 w-10 animate-pulse rounded-sm bg-muted" />
                    <div className="mt-1.5 h-2 w-14 animate-pulse rounded-sm bg-muted/70" />
                  </div>
                ))
              : metrics.map((m) => (
                  <div key={m.label} className="text-right">
                    <p className="font-mono text-base font-semibold tabular-nums leading-none text-foreground">
                      {m.value}
                    </p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                      {m.label}
                    </p>
                  </div>
                ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 border-b border-border bg-background/40 px-4 py-2">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter disputes, player, category…"
              disabled={isLoading}
              className="h-7 w-full rounded-sm border border-border bg-card pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none disabled:opacity-50"
            />
          </div>
          <div className="flex items-center gap-1">
            {["ALL", "OPEN", "ESCALATED", "PENDING", "RESOLVED"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                disabled={isLoading}
                className={cn(
                  "rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors disabled:opacity-50",
                  statusFilter === s
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            disabled={isLoading}
            className="ml-auto flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <Filter className="size-3.5" />
            <span className="hidden sm:inline">Advanced</span>
          </button>
        </div>

        {/* Dispute table */}
        <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                <Th>Case</Th>
                <Th>Player</Th>
                <Th>Category</Th>
                <Th>Amount</Th>
                <Th>Pri</Th>
                <Th>Status</Th>
                <Th>Age</Th>
                <Th>Assignee</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/60">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-4 py-2.5">
                          <div className="h-3 animate-pulse rounded-sm bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                : filtered.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => setSelectedId(d.id)}
                      className={cn(
                        "cursor-pointer border-b border-border/60 text-xs transition-colors",
                        selected.id === d.id ? "bg-accent/10" : "hover:bg-secondary/50",
                      )}
                    >
                      <td className="px-4 py-2.5 font-mono font-semibold text-foreground">{d.id}</td>
                      <td className="px-4 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{d.player}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{d.playerId}</p>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-foreground/80">{d.category}</td>
                      <td className="px-4 py-2.5 font-mono tabular-nums text-foreground">{d.amount}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-[3px] border px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                            priorityStyle[d.priority],
                          )}
                        >
                          {d.priority}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide">
                          <span className={cn("size-1.5 rounded-full", statusDot[d.status])} />
                          <span className={statusStyle[d.status]}>{d.status}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono tabular-nums text-muted-foreground">{d.age}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            "font-mono text-[11px]",
                            d.assignee === "@unassigned" ? "text-destructive/80" : "text-muted-foreground",
                          )}
                        >
                          {d.assignee}
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!isLoading && filtered.length === 0 && (
            <p className="p-8 text-center font-mono text-xs text-muted-foreground">
              No disputes match the current filters.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-card px-4 py-1.5 font-mono text-[10px] text-muted-foreground">
          <span>
            {isLoading ? "— / — cases" : `${filtered.length} / ${disputeList.length} cases`}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 animate-pulse rounded-full bg-success" />
            LIVE • SLA monitor on
          </span>
        </div>
      </section>

      {/* RIGHT PANE — Player Dossier Inspector */}
      {isLoading ? <PlayerDossierSkeleton /> : <PlayerDossier player={player} dispute={selected} />}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2 font-medium">{children}</th>
}

function PlayerDossierSkeleton() {
  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-y-auto bg-card scrollbar-thin">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="h-2.5 w-24 animate-pulse rounded-sm bg-muted" />
        <div className="h-2.5 w-12 animate-pulse rounded-sm bg-muted" />
      </div>
      <div className="space-y-3 border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="size-11 animate-pulse rounded-md bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-28 animate-pulse rounded-sm bg-muted" />
            <div className="h-2.5 w-20 animate-pulse rounded-sm bg-muted/70" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-sm border border-border bg-background" />
          ))}
        </div>
      </div>
      <div className="space-y-2 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded-sm bg-muted/60" />
        ))}
      </div>
    </aside>
  )
}

const tierStyle: Record<Player["tier"], string> = {
  BRONZE: "border-border text-muted-foreground",
  SILVER: "border-border text-foreground/70",
  GOLD: "border-warning/40 text-warning bg-warning/10",
  VIP: "border-accent/40 text-accent bg-accent/10",
  WHALE: "border-accent/50 text-accent bg-accent/10",
}

const playerStatusStyle: Record<Player["status"], string> = {
  ACTIVE: "text-success",
  FLAGGED: "text-warning",
  FROZEN: "text-destructive",
}

function PlayerDossier({ player: p, dispute }: { player: Player; dispute: Dispute }) {
  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-y-auto bg-card scrollbar-thin">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Player Dossier
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">{dispute.id}</span>
      </div>

      {/* Identity */}
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-md border border-border bg-secondary text-sm font-bold text-foreground">
            {p.handle.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{p.handle}</p>
            <p className="font-mono text-[11px] text-muted-foreground">{p.id}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-[3px] border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide",
              tierStyle[p.tier],
            )}
          >
            {p.tier}
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide">
            <span
              className={cn(
                "size-1.5 rounded-full",
                p.status === "ACTIVE" ? "bg-success" : p.status === "FLAGGED" ? "bg-warning" : "bg-destructive",
              )}
            />
            <span className={playerStatusStyle[p.status]}>{p.status}</span>
          </span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
          <Field label="Joined" value={p.joined} />
          <Field label="Country" value={p.country} />
          <Field label="KYC" value={p.kyc} />
          <Field label="Last Session" value={p.lastSession} />
        </dl>
      </div>

      {/* Financials */}
      <div className="border-b border-border p-4">
        <SectionLabel>Financials</SectionLabel>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Stat label="Lifetime Value" value={p.ltv} />
          <Stat label="Balance" value={p.balance} />
          <Stat label="Deposits" value={p.deposits} />
          <Stat label="Withdrawals" value={p.withdrawals} />
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <SectionLabel>Risk Score</SectionLabel>
            <span
              className={cn(
                "font-mono text-xs font-semibold tabular-nums",
                p.riskScore >= 80 ? "text-destructive" : p.riskScore >= 50 ? "text-warning" : "text-success",
              )}
            >
              {p.riskScore}/100
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                p.riskScore >= 80 ? "bg-destructive" : p.riskScore >= 50 ? "bg-warning" : "bg-success",
              )}
              style={{ width: `${p.riskScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Flags */}
      {p.flags.length > 0 && (
        <div className="border-b border-border p-4">
          <SectionLabel>Active Flags</SectionLabel>
          <ul className="mt-2 space-y-2">
            {p.flags.map((f) => (
              <li key={f.id} className="flex items-start gap-2 text-[11px]">
                <Flag
                  className={cn(
                    "mt-0.5 size-3 shrink-0",
                    f.severity === "CRITICAL" ? "text-destructive" : "text-warning",
                  )}
                />
                <span className="flex-1 text-foreground/80">{f.label}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{f.time}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent bets */}
      {p.recentBets.length > 0 && (
        <div className="border-b border-border p-4">
          <SectionLabel>Recent Bets</SectionLabel>
          <ul className="mt-2 space-y-1.5">
            {p.recentBets.map((b) => (
              <li key={b.id} className="flex items-center gap-2 font-mono text-[11px]">
                <span className="w-24 truncate text-foreground/80">{b.game}</span>
                <span className="tabular-nums text-muted-foreground">{b.stake}</span>
                <span
                  className={cn(
                    "ml-auto rounded-[2px] px-1 text-[9px] font-semibold uppercase",
                    b.outcome === "WIN" ? "text-success" : "text-destructive",
                  )}
                >
                  {b.outcome}
                </span>
                <span className="w-14 text-right tabular-nums text-foreground">{b.payout}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Administrative quick actions */}
      <div className="mt-auto space-y-2 p-4">
        <SectionLabel>Administrative Actions</SectionLabel>
        <button className="flex w-full items-center gap-2 rounded-sm border border-border bg-background px-3 py-2 text-xs text-foreground transition-colors hover:bg-secondary">
          <CheckCircle2 className="size-3.5 text-muted-foreground" /> Resolve & refund
        </button>
        <button className="flex w-full items-center gap-2 rounded-sm border border-border bg-background px-3 py-2 text-xs text-foreground transition-colors hover:bg-secondary">
          <ArrowUpRight className="size-3.5 text-muted-foreground" /> Escalate to tier-2
        </button>
        <button className="flex w-full items-center gap-2 rounded-sm border border-border bg-background px-3 py-2 text-xs text-foreground transition-colors hover:bg-secondary">
          <Dices className="size-3.5 text-muted-foreground" /> Run RNG audit
        </button>
        <button className="flex w-full items-center gap-2 rounded-sm border border-border bg-background px-3 py-2 text-xs text-foreground transition-colors hover:bg-secondary">
          <MessageSquareWarning className="size-3.5 text-muted-foreground" /> Message player
        </button>
        <button className="flex w-full items-center gap-2 rounded-sm border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning transition-colors hover:bg-warning/10">
          <Snowflake className="size-3.5" /> Freeze withdrawals
        </button>
        <button className="flex w-full items-center gap-2 rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive transition-colors hover:bg-destructive/10">
          <ShieldAlert className="size-3.5" /> Suspend account
        </button>
      </div>
    </aside>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{children}</p>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{value}</dd>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-background px-2.5 py-2">
      <p className="font-mono text-sm font-semibold tabular-nums text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  )
}
