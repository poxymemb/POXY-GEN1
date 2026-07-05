"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Loader2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import type { StaffMember, SupportTicketRow, TicketMessage, TicketPlayerSnapshot } from "@/lib/queries"
import { formatDate, formatDateTime, getDisplayStatus, getSlaStatus, shortTicketId } from "@/lib/mcu-utils"
import { QuickRepliesPanel } from "@/components/mcu/quick-replies-panel"

type FilterTab = "ALL" | "OPEN" | "IN_PROGRESS" | "CLOSED" | "ABUSE"

const FILTER_TABS: FilterTab[] = ["ALL", "OPEN", "IN_PROGRESS", "CLOSED", "ABUSE"]

function StatusBadge({ ticket }: { ticket: SupportTicketRow }) {
  const status = getDisplayStatus(ticket)
  const styles: Record<string, string> = {
    OPEN: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
    IN_PROGRESS: "border-blue-500/40 bg-blue-500/10 text-blue-400",
    CLOSED: "border-zinc-600/60 bg-zinc-800/40 text-zinc-400",
    ESCALATED: "border-red-500/40 bg-red-500/10 text-red-400",
  }

  return (
    <span
      className={cn(
        "inline-flex rounded-[3px] border px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-widest",
        styles[status],
      )}
    >
      {status.replace("_", " ")}
    </span>
  )
}

function SlaBadge({ ticket }: { ticket: SupportTicketRow }) {
  const sla = getSlaStatus(ticket.last_player_message_at, ticket.status)
  const colors = {
    green: "text-emerald-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
    muted: "text-muted-foreground",
  }

  return (
    <span
      className={cn(
        "font-mono text-[10px] tabular-nums",
        colors[sla.color],
        sla.pulse && "animate-pulse",
      )}
    >
      {sla.text}
    </span>
  )
}

export function SupportTicketsModule() {
  const [tickets, setTickets] = useState<SupportTicketRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>("ALL")
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [snapshot, setSnapshot] = useState<TicketPlayerSnapshot | null>(null)
  const [activeTicket, setActiveTicket] = useState<SupportTicketRow | null>(null)
  const [chatLoading, setChatLoading] = useState(false)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [showEscalate, setShowEscalate] = useState(false)
  const [escalateTo, setEscalateTo] = useState("")
  const [escalateReason, setEscalateReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const loadTickets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filter !== "ALL") params.set("status", filter.toLowerCase())
      if (search.trim()) params.set("search", search.trim())

      const res = await fetch(`/api/mcu/tickets?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load tickets")
      setTickets(data.tickets ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tickets")
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  const loadTicketDetail = useCallback(async (ticketId: string) => {
    setChatLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/mcu/tickets/${ticketId}/messages`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load ticket")
      setMessages(data.messages ?? [])
      setSnapshot(data.snapshot ?? null)
      setActiveTicket(data.ticket ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ticket")
    } finally {
      setChatLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTickets()
  }, [loadTickets])

  useEffect(() => {
    fetch("/api/nullspace/team")
      .then((r) => r.json())
      .then((data) => setStaff(data.staff ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedId) void loadTicketDetail(selectedId)
    else {
      setMessages([])
      setSnapshot(null)
      setActiveTicket(null)
    }
  }, [selectedId, loadTicketDetail])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("mcu-support-tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => {
        void loadTickets()
        if (selectedId) void loadTicketDetail(selectedId)
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages" },
        (payload) => {
          const row = payload.new as { ticket_id?: string }
          if (row.ticket_id === selectedId) void loadTicketDetail(selectedId)
          void loadTickets()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadTickets, loadTicketDetail, selectedId])

  const escalateStaff = useMemo(
    () => staff.filter((m) => m.profiles?.id && ["superadmin", "admin", "mod"].includes(m.role)),
    [staff],
  )

  async function runAction(action: string, extra?: Record<string, unknown>) {
    if (!selectedId) return
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/mcu/tickets/${selectedId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Action failed")
      await loadTickets()
      await loadTicketDetail(selectedId)
      setShowEscalate(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed")
    } finally {
      setActionLoading(false)
    }
  }

  async function sendReply() {
    if (!selectedId || !reply.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/mcu/tickets/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Send failed")
      setMessages(data.messages ?? [])
      setReply("")
      await loadTickets()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed")
    } finally {
      setSending(false)
    }
  }

  function handleMarkAbuse() {
    const reason = window.prompt("Abuse reason:")
    if (!reason?.trim()) return
    void runAction("mark_abuse", { reason: reason.trim() })
  }

  function handleBanUser() {
    const reason = window.prompt("Ban reason:")
    if (!reason?.trim()) return
    const daysRaw = window.prompt("Ban duration in days:", "7")
    const days = parseInt(daysRaw ?? "7", 10)
    if (!days || days < 1) return
    void runAction("ban_user", { reason: reason.trim(), days })
  }

  const filteredTickets = tickets

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <div>
          <h1 className="font-mono text-sm font-semibold uppercase tracking-widest text-foreground">
            Support Tickets
          </h1>
          <p className="font-mono text-[10px] text-muted-foreground">POXY WORLD // Support Ops</p>
        </div>
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
          {filteredTickets.length} tickets
        </span>
      </header>

      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-2 font-mono text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Left panel — queue */}
        <div className="flex w-full max-w-md shrink-0 flex-col border-r border-border">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search username or subject…"
                className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 font-mono text-xs text-foreground outline-none focus:border-foreground/30"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={cn(
                    "rounded-[3px] border px-2 py-0.5 font-mono text-[9px] font-semibold tracking-widest transition-colors",
                    filter === tab
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/30",
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <p className="px-4 py-8 text-center font-mono text-xs text-muted-foreground">No tickets found</p>
            ) : (
              filteredTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedId(ticket.id)}
                  className={cn(
                    "w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-sidebar-accent/40",
                    selectedId === ticket.id && "bg-sidebar-accent/60",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          #{shortTicketId(ticket.id)}
                        </span>
                        <StatusBadge ticket={ticket} />
                      </div>
                      <p className="mt-1 truncate text-xs font-medium text-foreground">
                        @{ticket.profiles?.username ?? "player"}
                      </p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">{ticket.subject}</p>
                    </div>
                    <SlaBadge ticket={ticket} />
                  </div>
                  <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                    <span>{ticket.assignee_username ? `@${ticket.assignee_username}` : "Unassigned"}</span>
                    <span>{formatDateTime(ticket.updated_at)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right panel — chat */}
        <div className="flex min-w-0 flex-1 flex-col">
          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center font-mono text-xs text-muted-foreground">
              Select a ticket from the queue
            </div>
          ) : chatLoading && !activeTicket ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : activeTicket ? (
            <>
              <div className="shrink-0 border-b border-border px-5 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-sm font-medium text-foreground">
                    @{activeTicket.profiles?.username ?? "player"}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="truncate font-mono text-xs text-muted-foreground">{activeTicket.subject}</span>
                  <StatusBadge ticket={activeTicket} />
                  <SlaBadge ticket={activeTicket} />
                  {snapshot && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 font-mono text-[10px]",
                        snapshot.is_online ? "text-emerald-400" : "text-muted-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          snapshot.is_online ? "bg-emerald-400" : "bg-zinc-600",
                        )}
                      />
                      {snapshot.is_online ? "Online" : "Offline"}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4 scrollbar-thin">
                {messages.map((msg) => {
                  const username =
                    msg.profiles?.username ??
                    (msg.is_staff ? "staff" : activeTicket.profiles?.username ?? "player")
                  const bodyText = msg.body ?? (msg.image_url ? "[image]" : "—")

                  if (msg.is_auto) {
                    return (
                      <div key={msg.id} className="mx-auto max-w-[75%] text-center">
                        <p
                          className="text-xs italic text-zinc-400"
                          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                        >
                          {bodyText}
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-500">{formatDateTime(msg.created_at)}</p>
                      </div>
                    )
                  }

                  if (msg.is_staff) {
                    return (
                      <div key={msg.id} className="ml-auto flex max-w-[75%] flex-col items-end">
                        <div className="mb-1 flex items-center gap-2">
                          <span
                            className="text-[11px] text-zinc-500"
                            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                          >
                            @{username}
                          </span>
                          <span className="text-[11px] text-zinc-500">{formatDateTime(msg.created_at)}</span>
                        </div>
                        <div
                          className="rounded-lg border-l-2 border-accent bg-zinc-800 px-4 py-3 text-sm text-white"
                          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                        >
                          {bodyText}
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={msg.id} className="mr-auto flex max-w-[75%] gap-2">
                      <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-900 text-[10px] font-semibold uppercase text-zinc-300">
                        {msg.profiles?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={msg.profiles.avatar_url}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          (username[0] ?? "?").toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="mb-1 text-xs font-medium text-zinc-300"
                          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                        >
                          @{username}
                        </p>
                        <div
                          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white"
                          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                        >
                          {bodyText}
                        </div>
                        <p className="mt-1 text-[11px] text-zinc-500">{formatDateTime(msg.created_at)}</p>
                      </div>
                    </div>
                  )
                })}
                <div ref={chatEndRef} />
              </div>

              {activeTicket.status !== "closed" && (
                <div className="shrink-0 border-t border-border px-5 py-3">
                  <div className="flex gap-2">
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          void sendReply()
                        }
                      }}
                      rows={2}
                      placeholder="Staff reply…"
                      className="min-h-[44px] flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground/30"
                    />
                    <Button onClick={() => void sendReply()} disabled={sending || !reply.trim()} size="sm">
                      {sending ? <Loader2 className="size-3.5 animate-spin" /> : "Send"}
                    </Button>
                  </div>
                  <QuickRepliesPanel
                    onInsert={(text) => setReply((prev) => (prev ? `${prev}\n\n${text}` : text))}
                    disabled={sending}
                  />
                </div>
              )}

              <div className="shrink-0 border-t border-border px-5 py-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={actionLoading || activeTicket.status === "closed"}
                    onClick={() => void runAction("assign_me")}
                  >
                    Assign to me
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={actionLoading || activeTicket.status === "closed"}
                    onClick={() => void runAction("in_progress")}
                  >
                    In Progress
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={actionLoading || activeTicket.status === "closed"}
                    onClick={() => setShowEscalate((v) => !v)}
                  >
                    Escalate ↑
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={actionLoading || activeTicket.status === "closed"}
                    onClick={() => void runAction("close")}
                  >
                    Close ticket
                  </Button>
                  <Button variant="outline" size="xs" disabled={actionLoading} onClick={handleMarkAbuse}>
                    Mark abuse
                  </Button>
                  <Button variant="destructive" size="xs" disabled={actionLoading} onClick={handleBanUser}>
                    Ban user
                  </Button>
                </div>

                {showEscalate && (
                  <div className="mt-3 rounded-md border border-border bg-background/60 p-3">
                    <select
                      value={escalateTo}
                      onChange={(e) => setEscalateTo(e.target.value)}
                      className="mb-2 w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs"
                    >
                      <option value="">Select staff…</option>
                      {escalateStaff.map((m) => (
                        <option key={m.profiles?.id ?? m.email} value={m.profiles?.id ?? ""}>
                          @{m.profiles?.username ?? m.email.split("@")[0]} ({m.role})
                        </option>
                      ))}
                    </select>
                    <input
                      value={escalateReason}
                      onChange={(e) => setEscalateReason(e.target.value)}
                      placeholder="Escalation reason…"
                      className="mb-2 w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs"
                    />
                    <Button
                      size="xs"
                      disabled={actionLoading || !escalateTo || !escalateReason.trim()}
                      onClick={() =>
                        void runAction("escalate", {
                          assign_to: escalateTo,
                          reason: escalateReason.trim(),
                        })
                      }
                    >
                      Confirm escalation
                    </Button>
                  </div>
                )}

                {snapshot && (
                  <div className="mt-4 rounded-md border border-border bg-background/40 p-3">
                    <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Player Snapshot
                    </p>
                    <div className="grid gap-1 font-mono text-[11px] text-foreground">
                      <p>
                        PX: <strong>{snapshot.px_balance}</strong> · Level: <strong>{snapshot.xp_level}</strong>
                      </p>
                      <p>Member since: {formatDate(snapshot.member_since)}</p>
                      <p>Last 3 drops: {snapshot.last_drops.join(", ") || "—"}</p>
                      <p>Compensations: {snapshot.compensations_count}</p>
                    </div>
                    <Link
                      href={`/mcu/dossier?user=${snapshot.user_id}`}
                      className="mt-3 inline-flex font-mono text-[10px] uppercase tracking-widest text-foreground underline-offset-4 hover:underline"
                    >
                      Full Dossier →
                    </Link>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
