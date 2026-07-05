"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { McuUpdate, StaffProfileRef } from "@/lib/queries"
import {
  UPDATE_FILTER_TABS,
  PUBLISH_TYPE_OPTIONS,
  getUpdateTypeMeta,
  type UpdateFilterTab,
} from "@/lib/mcu-updates-meta"
import { renderBasicMarkdown } from "@/lib/mcu-markdown"
import { formatDate, formatDateTime } from "@/lib/mcu-utils"

type UpdatesPayload = {
  updates: McuUpdate[]
  staffProfiles: StaffProfileRef[]
  currentUserId: string
  canPublish: boolean
  urgentUnread: McuUpdate[]
}

export function UpdatesCenterModule() {
  const [data, setData] = useState<UpdatesPayload | null>(null)
  const [filter, setFilter] = useState<UpdateFilterTab>("ALL")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const [pubType, setPubType] = useState("general")
  const [pubTitle, setPubTitle] = useState("")
  const [pubBody, setPubBody] = useState("")
  const [pubPin, setPubPin] = useState(false)
  const [pubConfirm, setPubConfirm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = filter !== "ALL" ? `?filter=${filter}` : ""
      const res = await fetch(`/api/mcu/updates${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to load updates")
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load updates")
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  const selected = useMemo(
    () => data?.updates.find((u) => u.id === selectedId) ?? null,
    [data, selectedId],
  )

  const mineRead = selected?.mcu_update_reads.find((r) => r.staff_id === data?.currentUserId)
  const showConfirmBtn = selected?.requires_confirmation && !mineRead?.confirmed

  async function handleConfirm(id: string) {
    setConfirming(true)
    setError(null)
    try {
      const res = await fetch(`/api/mcu/updates/${id}/confirm`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Confirm failed")
      setData((prev) => (prev ? { ...prev, updates: json.updates } : prev))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirm failed")
    } finally {
      setConfirming(false)
    }
  }

  async function handlePublish() {
    if (!pubTitle.trim() || !pubBody.trim()) {
      setError("Title and body required")
      return
    }
    setPublishing(true)
    setError(null)
    try {
      const res = await fetch("/api/mcu/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: pubType,
          title: pubTitle.trim(),
          body: pubBody.trim(),
          is_pinned: pubPin,
          requires_confirmation: pubConfirm,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Publish failed")
      setShowPublish(false)
      setPubTitle("")
      setPubBody("")
      setPubPin(false)
      setPubConfirm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed")
    } finally {
      setPublishing(false)
    }
  }

  function buildConfirmList(update: McuUpdate) {
    if (!data?.staffProfiles.length) return null
    const readMap = Object.fromEntries(update.mcu_update_reads.map((r) => [r.staff_id, r]))
    return data.staffProfiles.map((staff) => {
      const read = readMap[staff.id]
      const name = staff.username ?? staff.email.split("@")[0]
      if (read?.confirmed) {
        return (
          <div key={staff.id} className="flex justify-between font-mono text-[11px]">
            <span className="text-emerald-400">✅ @{name}</span>
            <span className="text-muted-foreground">{formatDateTime(read.confirmed_at ?? read.read_at)}</span>
          </div>
        )
      }
      return (
        <div key={staff.id} className="flex justify-between font-mono text-[11px]">
          <span className="text-yellow-400">⏳ @{name}</span>
          <span className="text-muted-foreground">{read ? "read, not confirmed" : "not confirmed"}</span>
        </div>
      )
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <div>
          <h1 className="font-mono text-sm font-semibold uppercase tracking-widest text-foreground">Updates Center</h1>
          <p className="font-mono text-[10px] text-muted-foreground">NULLSPACE LAB // Staff Broadcasts</p>
        </div>
        {data?.canPublish && (
          <Button size="sm" onClick={() => setShowPublish(true)}>
            Publish
          </Button>
        )}
      </header>

      {data?.urgentUnread && data.urgentUnread.length > 0 && (
        <div className="border-b border-red-500/30 bg-red-500/10 px-5 py-3">
          <p className="font-mono text-xs text-red-400">
            🔴 You have {data.urgentUnread.length} unread urgent update{data.urgentUnread.length === 1 ? "" : "s"}:{" "}
            {data.urgentUnread
              .slice(0, 2)
              .map((u) => `«${u.title}»`)
              .join(", ")}
          </p>
        </div>
      )}

      <div className="border-b border-border px-5 py-3">
        <div className="flex flex-wrap gap-1">
          {UPDATE_FILTER_TABS.map((tab) => (
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

      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-2 font-mono text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 scrollbar-thin">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.updates.length ? (
          <p className="py-8 text-center font-mono text-xs text-muted-foreground">No updates yet</p>
        ) : (
          <div className="mx-auto grid max-w-3xl gap-3">
            {data.updates.map((update) => {
              const meta = getUpdateTypeMeta(update.type)
              const mine = update.mcu_update_reads.find((r) => r.staff_id === data.currentUserId)
              return (
                <button
                  key={update.id}
                  type="button"
                  onClick={() => setSelectedId(update.id)}
                  className="rounded-lg border border-border bg-background/40 p-4 text-left transition-colors hover:border-foreground/20 hover:bg-sidebar-accent/20"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-[3px] border px-1.5 py-0.5 font-mono text-[9px] font-semibold",
                        meta.className,
                      )}
                    >
                      {meta.badge}
                    </span>
                    {update.is_pinned && <span className="text-xs">📌</span>}
                    {update.requires_confirmation && (
                      <span className="font-mono text-[9px] text-amber-400">Requires confirmation</span>
                    )}
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                      {formatDate(update.created_at)} · @{update.author_username ?? "staff"}
                    </span>
                  </div>
                  <h3 className="font-mono text-sm font-semibold text-foreground">{update.title}</h3>
                  {update.requires_confirmation && update.staff_total > 0 && (
                    <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                      ✅ {update.confirmed_count}/{update.staff_total} confirmed
                    </p>
                  )}
                  {!update.requires_confirmation && mine && (
                    <p className="mt-2 font-mono text-[10px] text-emerald-400">✓ Read by you</p>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
            <div className="flex items-start justify-between border-b border-border px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap gap-2">
                  <span
                    className={cn(
                      "rounded-[3px] border px-1.5 py-0.5 font-mono text-[9px] font-semibold",
                      getUpdateTypeMeta(selected.type).className,
                    )}
                  >
                    {getUpdateTypeMeta(selected.type).badge}
                  </span>
                  {selected.is_pinned && <span>📌</span>}
                </div>
                <h2 className="font-mono text-base font-semibold text-foreground">{selected.title}</h2>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {formatDateTime(selected.created_at)} · @{selected.author_username ?? "staff"}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
              <div dangerouslySetInnerHTML={{ __html: renderBasicMarkdown(selected.body) }} />
              <div className="my-4 border-t border-border" />
              <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Read confirmations
              </p>
              <div className="space-y-1">{buildConfirmList(selected)}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
              {showConfirmBtn && (
                <Button size="sm" disabled={confirming} onClick={() => void handleConfirm(selected.id)}>
                  {confirming ? <Loader2 className="size-3.5 animate-spin" /> : "✓ Confirm reading"}
                </Button>
              )}
              {mineRead?.confirmed && (
                <span className="font-mono text-xs text-emerald-400">✅ Confirmed by you</span>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {showPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-lg border border-border bg-background p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-mono text-sm font-semibold uppercase tracking-widest">Publish update</h2>
              <button type="button" onClick={() => setShowPublish(false)}>
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <select
                value={pubType}
                onChange={(e) => setPubType(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-2 font-mono text-xs"
              >
                {PUBLISH_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                value={pubTitle}
                onChange={(e) => setPubTitle(e.target.value)}
                placeholder="Title"
                className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
              />
              <textarea
                value={pubBody}
                onChange={(e) => setPubBody(e.target.value)}
                placeholder="Markdown body…"
                rows={8}
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
              />
              <label className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <input type="checkbox" checked={pubPin} onChange={(e) => setPubPin(e.target.checked)} />
                Pin to top
              </label>
              <label className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <input type="checkbox" checked={pubConfirm} onChange={(e) => setPubConfirm(e.target.checked)} />
                Requires confirmation
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => void handlePublish()} disabled={publishing}>
                {publishing ? <Loader2 className="size-3.5 animate-spin" /> : "Publish"}
              </Button>
              <Button variant="ghost" onClick={() => setShowPublish(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
