"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Loader2, Paperclip, Send, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import type { OsChannelRow, OsMessageRow } from "@/lib/queries"
import { formatRelative } from "@/lib/mcu-utils"

type ChannelWithMeta = OsChannelRow & {
  unread: number
  displayName: string
}

type ChannelsPayload = {
  groupChannels: ChannelWithMeta[]
  directChannels: ChannelWithMeta[]
  currentUserId: string
  currentUserOnline: boolean
  staffTeam: Array<{
    profile_id: string | null
    email: string
    username: string | null
    is_online: boolean
  }>
}

type AttachKind = "ticket" | "asset" | "round"

type PendingAttach = {
  type: AttachKind
  ref: string
  label: string
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        online ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" : "bg-zinc-600",
      )}
    />
  )
}

function AttachmentCard({ message }: { message: OsMessageRow }) {
  const t = message.attachment_type
  const ref = message.attachment_ref
  if (!t || !ref) return null

  const shortRef = ref.slice(0, 8).toUpperCase()

  if (t === "ticket") {
    const label = (message.attachment_url ?? "").replace(/^🎫\s*/, "") || shortRef
    return (
      <Link
        href={`/mcu/tickets?ticket=${ref}`}
        className="mt-2 block rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 transition-colors hover:border-zinc-500"
      >
        <div className="font-mono text-[10px] font-semibold text-foreground">🎫 Support ticket</div>
        <div className="font-mono text-[10px] text-muted-foreground">{label}</div>
      </Link>
    )
  }

  if (t === "asset") {
    return (
      <div className="mt-2 rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2">
        <div className="font-mono text-[10px] font-semibold text-foreground">📦 Asset</div>
        <div className="font-mono text-[10px] text-muted-foreground">
          {message.attachment_url ?? shortRef}
        </div>
      </div>
    )
  }

  if (t === "round" || t === "rng") {
    return (
      <Link
        href={`/mcu/rng?round=${ref}`}
        className="mt-2 block rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 transition-colors hover:border-zinc-500"
      >
        <div className="font-mono text-[10px] font-semibold text-foreground">🎲 RNG round</div>
        <div className="font-mono text-[10px] text-muted-foreground">{shortRef}…</div>
      </Link>
    )
  }

  return null
}

export function MessengerModule() {
  const [channelsData, setChannelsData] = useState<ChannelsPayload | null>(null)
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [activeChannel, setActiveChannel] = useState<
    (OsChannelRow & { displayName: string; description: string; memberCount: number }) | null
  >(null)
  const [messages, setMessages] = useState<OsMessageRow[]>([])
  const [loadingChannels, setLoadingChannels] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [showDmModal, setShowDmModal] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchKind, setSearchKind] = useState<AttachKind | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; label: string; meta?: string }>
  >([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [pendingAttach, setPendingAttach] = useState<PendingAttach | null>(null)
  const [creatingDm, setCreatingDm] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const loadChannels = useCallback(async () => {
    setLoadingChannels(true)
    setError(null)
    try {
      const res = await fetch("/api/mcu/messenger/channels")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to load channels")
      setChannelsData(json)
      return json as ChannelsPayload
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load channels")
      return null
    } finally {
      setLoadingChannels(false)
    }
  }, [])

  const loadMessages = useCallback(async (channelId: string) => {
    setLoadingMessages(true)
    setError(null)
    try {
      const res = await fetch(`/api/mcu/messenger/${channelId}/messages`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to load messages")
      setActiveChannel(json.channel)
      setMessages(json.messages ?? [])
      setChannelsData((prev) => {
        if (!prev) return prev
        const clearUnread = (list: ChannelWithMeta[]) =>
          list.map((c) => (c.id === channelId ? { ...c, unread: 0 } : c))
        return {
          ...prev,
          groupChannels: clearUnread(prev.groupChannels),
          directChannels: clearUnread(prev.directChannels),
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages")
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  const openChannel = useCallback(
    async (channelId: string) => {
      setActiveChannelId(channelId)
      await loadMessages(channelId)
    },
    [loadMessages],
  )

  useEffect(() => {
    void loadChannels().then((data) => {
      if (!data) return
      const all = [...data.groupChannels, ...data.directChannels]
      const general = data.groupChannels.find((c) => c.name === "#general")
      const first = general ?? all[0]
      if (first && !activeChannelId) void openChannel(first.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!activeChannelId) return

    const supabase = getSupabase()
    const channel = supabase
      .channel(`messenger-${activeChannelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "os_messages",
          filter: `channel_id=eq.${activeChannelId}`,
        },
        (payload) => {
          const msg = payload.new as OsMessageRow
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev
            return [...prev, msg]
          })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [activeChannelId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend() {
    if (!activeChannelId || sending) return
    const text = draft.trim()
    if (!text && !pendingAttach) return

    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/mcu/messenger/${activeChannelId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: text || null,
          attachment_type: pendingAttach?.type ?? null,
          attachment_ref: pendingAttach?.ref ?? null,
          attachment_url: pendingAttach?.label ?? null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Send failed")

      setMessages((prev) => {
        if (prev.some((m) => m.id === json.message.id)) return prev
        return [...prev, json.message]
      })
      setDraft("")
      setPendingAttach(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed")
    } finally {
      setSending(false)
    }
  }

  async function handleStartDm(staffId: string) {
    setCreatingDm(true)
    setError(null)
    try {
      const res = await fetch("/api/mcu/messenger/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to open DM")
      setShowDmModal(false)
      await loadChannels()
      await openChannel(json.channelId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open DM")
    } finally {
      setCreatingDm(false)
    }
  }

  async function runAttachSearch(kind: AttachKind, query: string) {
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    const supabase = getSupabase()
    try {
      if (kind === "ticket") {
        const { data } = await supabase
          .from("support_tickets")
          .select("id, subject, status")
          .ilike("subject", `%${query}%`)
          .limit(12)
        setSearchResults(
          (data ?? []).map((t) => ({
            id: t.id,
            label: `🎫 ${t.subject}`,
            meta: t.status,
          })),
        )
      } else if (kind === "asset") {
        const { data: up } = await supabase
          .from("user_poxy")
          .select("id, serial_number, poxy_tier")
          .ilike("serial_number", `%${query}%`)
          .limit(8)
        if (up?.length) {
          setSearchResults(
            up.map((a) => ({
              id: a.id,
              label: `📦 ${a.serial_number} · ${a.poxy_tier}`,
            })),
          )
        } else {
          const { data: pa } = await supabase
            .from("poxy_assets")
            .select("id, serial_number")
            .ilike("serial_number", `%${query}%`)
            .limit(8)
          setSearchResults(
            (pa ?? []).map((a) => ({
              id: a.id,
              label: `📦 ${a.serial_number ?? a.id}`,
            })),
          )
        }
      } else {
        const { data } = await supabase
          .from("rng_rounds")
          .select("id, status")
          .ilike("id", `${query}%`)
          .limit(10)
        setSearchResults(
          (data ?? []).map((r) => ({
            id: r.id,
            label: `🎲 Round ${String(r.id).slice(0, 8)}…`,
            meta: r.status ?? undefined,
          })),
        )
      }
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  function openAttachSearch(kind: AttachKind) {
    setSearchKind(kind)
    setSearchQuery("")
    setSearchResults([])
    setShowAttachMenu(false)
    setShowSearchModal(true)
  }

  function selectAttach(item: { id: string; label: string }, kind: AttachKind) {
    setPendingAttach({ type: kind, ref: item.id, label: item.label })
    setShowSearchModal(false)
    setSearchKind(null)
  }

  function ChannelRow({ channel, isDm }: { channel: ChannelWithMeta; isDm?: boolean }) {
    const active = channel.id === activeChannelId
    const urgent = channel.name === "#urgent"

    return (
      <button
        type="button"
        onClick={() => void openChannel(channel.id)}
        className={cn(
          "flex w-full items-center gap-2 border-b border-zinc-800/60 px-3 py-2.5 text-left transition-colors",
          active ? "bg-zinc-800/80" : "hover:bg-zinc-900/60",
        )}
      >
        {isDm ? <StatusDot online /> : <StatusDot online={channel.unread > 0} />}
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground">
          {urgent && "🔴 "}
          {channel.displayName}
        </span>
        {channel.unread > 0 && (
          <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-emerald-400">
            {channel.unread > 99 ? "99+" : channel.unread}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-zinc-800/80 px-4 py-3">
        <h1 className="font-mono text-sm font-semibold tracking-widest text-foreground">
          INTERNAL MESSENGER
        </h1>
        <p className="font-mono text-[10px] text-muted-foreground">Staff channels & direct messages</p>
      </header>

      {error && (
        <div className="mx-4 mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-[11px] text-red-400">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Left panel — channels */}
        <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950/40">
          <div className="flex items-center justify-between border-b border-zinc-800/60 px-3 py-2">
            <div className="flex items-center gap-2">
              <StatusDot online={channelsData?.currentUserOnline ?? true} />
              <span className="font-mono text-[10px] text-muted-foreground">You</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 border-zinc-700 bg-transparent px-2 font-mono text-[10px]"
              onClick={() => setShowDmModal(true)}
            >
              + New DM
            </Button>
          </div>

          {loadingChannels ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="px-3 py-2 font-mono text-[9px] font-semibold tracking-widest text-muted-foreground">
                CHANNELS
              </div>
              {channelsData?.groupChannels.map((ch) => (
                <ChannelRow key={ch.id} channel={ch} />
              ))}

              <div className="mt-2 px-3 py-2 font-mono text-[9px] font-semibold tracking-widest text-muted-foreground">
                DIRECT MESSAGES
              </div>
              {channelsData?.directChannels.length ? (
                channelsData.directChannels.map((ch) => (
                  <ChannelRow key={ch.id} channel={ch} isDm />
                ))
              ) : (
                <p className="px-3 py-2 font-mono text-[10px] text-muted-foreground">No DMs yet</p>
              )}
            </div>
          )}
        </aside>

        {/* Right panel — chat */}
        <section className="flex min-w-0 flex-1 flex-col">
          {!activeChannel ? (
            <div className="flex flex-1 items-center justify-center font-mono text-[11px] text-muted-foreground">
              Select a channel
            </div>
          ) : (
            <>
              <div className="shrink-0 border-b border-zinc-800/60 px-4 py-3">
                <h2 className="font-mono text-sm font-semibold text-foreground">
                  {activeChannel.displayName}
                </h2>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {activeChannel.description} · {activeChannel.memberCount} members
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center font-mono text-[11px] text-muted-foreground">
                    No messages yet — say hello!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => {
                      if (msg.is_system) {
                        return (
                          <div key={msg.id} className="text-center">
                            <p className="font-mono text-[11px] italic text-zinc-500">
                              {msg.body}
                            </p>
                            <span className="font-mono text-[9px] text-zinc-600">
                              {formatRelative(msg.created_at)}
                            </span>
                          </div>
                        )
                      }

                      const isMine = msg.sender_id === channelsData?.currentUserId
                      return (
                        <div
                          key={msg.id}
                          className={cn("flex gap-2", isMine ? "flex-row-reverse" : "flex-row")}
                        >
                          {!isMine && (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 font-mono text-[9px] text-foreground">
                              {(msg.sender_username ?? "S").slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className={cn("max-w-[75%]", isMine ? "items-end" : "items-start")}>
                            {!isMine && (
                              <div className="mb-0.5 font-mono text-[9px] text-muted-foreground">
                                @{msg.sender_username ?? "staff"}
                              </div>
                            )}
                            <div
                              className={cn(
                                "rounded-lg border px-3 py-2 font-mono text-[11px]",
                                isMine
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-foreground"
                                  : "border-zinc-700/60 bg-zinc-900/60 text-foreground",
                              )}
                            >
                              {msg.body}
                              <AttachmentCard message={msg} />
                            </div>
                            <div className="mt-0.5 font-mono text-[9px] text-zinc-600">
                              {formatRelative(msg.created_at)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {pendingAttach && (
                <div className="mx-4 mb-2 flex items-center gap-2 rounded-md border border-zinc-700/60 bg-zinc-900/40 px-3 py-1.5">
                  <span className="flex-1 truncate font-mono text-[10px] text-muted-foreground">
                    {pendingAttach.label}
                  </span>
                  <button type="button" onClick={() => setPendingAttach(null)}>
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              )}

              <div className="relative shrink-0 border-t border-zinc-800/60 p-3">
                <div className="flex gap-2">
                  <div className="relative">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 border-zinc-700 bg-transparent font-mono text-[10px]"
                      onClick={() => setShowAttachMenu((v) => !v)}
                    >
                      <Paperclip className="mr-1 h-3.5 w-3.5" />
                      Attach
                    </Button>
                    {showAttachMenu && (
                      <div className="absolute bottom-full left-0 z-10 mb-1 w-44 rounded-md border border-zinc-700 bg-zinc-950 py-1 shadow-xl">
                        {(
                          [
                            ["ticket", "🎫 Ticket"],
                            ["asset", "📦 Asset"],
                            ["round", "🎲 RNG Round"],
                          ] as const
                        ).map(([kind, label]) => (
                          <button
                            key={kind}
                            type="button"
                            className="block w-full px-3 py-1.5 text-left font-mono text-[10px] text-foreground hover:bg-zinc-800"
                            onClick={() => openAttachSearch(kind)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        void handleSend()
                      }
                    }}
                    placeholder="Type a message…"
                    rows={2}
                    className="min-h-[44px] flex-1 resize-none rounded-md border border-zinc-700/60 bg-zinc-950/60 px-3 py-2 font-mono text-[11px] text-foreground outline-none focus:border-zinc-500"
                  />
                  <Button
                    size="sm"
                    className="h-9 font-mono text-[10px]"
                    disabled={sending || (!draft.trim() && !pendingAttach)}
                    onClick={() => void handleSend()}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="mr-1 h-3.5 w-3.5" />
                        Send
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {/* New DM modal */}
      {showDmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-950 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-mono text-xs font-semibold tracking-widest">NEW DIRECT MESSAGE</h3>
              <button type="button" onClick={() => setShowDmModal(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {channelsData?.staffTeam.length ? (
                channelsData.staffTeam.map((member) => (
                  <button
                    key={member.profile_id}
                    type="button"
                    disabled={creatingDm}
                    onClick={() => member.profile_id && void handleStartDm(member.profile_id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-zinc-800/60"
                  >
                    <StatusDot online={member.is_online} />
                    <span className="font-mono text-[11px] text-foreground">
                      @{member.username ?? member.email.split("@")[0]}
                    </span>
                    {member.is_online && (
                      <span className="ml-auto font-mono text-[9px] text-emerald-400">online</span>
                    )}
                  </button>
                ))
              ) : (
                <p className="font-mono text-[10px] text-muted-foreground">No other staff online</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attach search modal */}
      {showSearchModal && searchKind && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-950 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-mono text-xs font-semibold tracking-widest">
                ATTACH{" "}
                {searchKind === "ticket"
                  ? "TICKET"
                  : searchKind === "asset"
                    ? "ASSET"
                    : "RNG ROUND"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowSearchModal(false)
                  setSearchKind(null)
                }}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                void runAttachSearch(searchKind, e.target.value)
              }}
              placeholder="Search…"
              className="mb-3 w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none focus:border-zinc-500"
              autoFocus
            />
            <div className="max-h-48 overflow-y-auto">
              {searchLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length ? (
                searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectAttach(item, searchKind)}
                    className="block w-full rounded-md px-2 py-2 text-left hover:bg-zinc-800/60"
                  >
                    <div className="font-mono text-[11px] text-foreground">{item.label}</div>
                    {item.meta && (
                      <div className="font-mono text-[9px] text-muted-foreground">{item.meta}</div>
                    )}
                  </button>
                ))
              ) : (
                <p className="py-2 text-center font-mono text-[10px] text-muted-foreground">
                  {searchQuery.length < 2 ? "Type at least 2 characters" : "No results"}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
