"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { MktCalendarPost, MktCampaign } from "@/lib/queries"
import { MKT_PLATFORMS, dateKey, platformIcon, toLocalDatetimeInput } from "@/lib/mcu-marketing"

const EMPTY_POST = {
  title: "",
  body: "",
  platform: "tiktok",
  status: "scheduled",
  scheduled_at: "",
  asset_url: "",
  campaign_id: "",
}

export function MarketingCalendarModule() {
  const [month, setMonth] = useState(() => new Date())
  const [posts, setPosts] = useState<MktCalendarPost[]>([])
  const [campaigns, setCampaigns] = useState<MktCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_POST)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const year = month.getFullYear()
      const m = month.getMonth() + 1
      const res = await fetch(`/api/mcu/marketing/calendar?year=${year}&month=${m}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to load calendar")
      setPosts(json.posts ?? [])
      setCampaigns(json.campaigns ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar")
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    void load()
  }, [load])

  const postsByDay = useMemo(() => {
    const map: Record<string, MktCalendarPost[]> = {}
    for (const post of posts) {
      if (!post.scheduled_at) continue
      const key = dateKey(new Date(post.scheduled_at))
      if (!map[key]) map[key] = []
      map[key].push(post)
    }
    for (const key of Object.keys(map)) {
      map[key].sort(
        (a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime(),
      )
    }
    return map
  }, [posts])

  const calendarCells = useMemo(() => {
    const y = month.getFullYear()
    const m = month.getMonth()
    const first = new Date(y, m, 1)
    const startPad = first.getDay()
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const todayKey = dateKey(new Date())
    const cells: Array<{ type: "pad" } | { type: "day"; day: number; key: string; today: boolean }> =
      []

    for (let i = 0; i < startPad; i++) cells.push({ type: "pad" })
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(y, m, day)
      const key = dateKey(date)
      cells.push({ type: "day", day, key, today: key === todayKey })
    }
    return cells
  }, [month])

  function openSchedule() {
    setEditId(null)
    const d = new Date()
    d.setHours(d.getHours() + 1, 0, 0, 0)
    setForm({ ...EMPTY_POST, scheduled_at: toLocalDatetimeInput(d.toISOString()) })
    setShowModal(true)
  }

  function openEdit(post: MktCalendarPost) {
    setEditId(post.id)
    setForm({
      title: post.title,
      body: post.body ?? "",
      platform: post.platform,
      status: post.status,
      scheduled_at: toLocalDatetimeInput(post.scheduled_at),
      asset_url: post.asset_url ?? "",
      campaign_id: post.campaign_id ?? "",
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError("Title required")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        campaign_id: form.campaign_id || null,
      }
      const res = await fetch("/api/mcu/marketing/calendar", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? { id: editId, ...payload } : payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Save failed")
      setShowModal(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editId || !confirm("Delete this post?")) return
    setSaving(true)
    try {
      const res = await fetch(`/api/mcu/marketing/calendar?id=${editId}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Delete failed")
      setShowModal(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="shrink-0 border-b border-zinc-800/80 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-mono text-sm font-semibold tracking-widest">CONTENT CALENDAR</h1>
            <p className="font-mono text-[10px] text-muted-foreground">Scheduled posts by month</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-zinc-700 bg-transparent font-mono text-[10px]"
            onClick={openSchedule}
          >
            + Schedule Post
          </Button>
        </div>
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            className="rounded-md border border-zinc-700 p-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[160px] text-center font-mono text-sm font-semibold">
            {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </span>
          <button
            type="button"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            className="rounded-md border border-zinc-700 p-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-[11px] text-red-400">
          {error}
        </div>
      )}

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[700px] grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  className="py-1 text-center font-mono text-[9px] font-semibold tracking-widest text-muted-foreground"
                >
                  {d}
                </div>
              ))}
              {calendarCells.map((cell, idx) =>
                cell.type === "pad" ? (
                  <div key={`pad-${idx}`} className="min-h-[88px] rounded-md bg-zinc-950/20" />
                ) : (
                  <div
                    key={cell.key}
                    className={cn(
                      "min-h-[88px] rounded-md border border-zinc-800/40 p-1",
                      cell.today && "border-emerald-500/40 bg-emerald-500/5",
                    )}
                  >
                    <div className="mb-1 font-mono text-[10px] text-muted-foreground">{cell.day}</div>
                    <div className="space-y-0.5">
                      {(postsByDay[cell.key] ?? []).map((post) => (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => openEdit(post)}
                          className="flex w-full items-center gap-1 rounded bg-zinc-800/60 px-1 py-0.5 text-left hover:bg-zinc-800"
                        >
                          <span>{platformIcon(post.platform)}</span>
                          <span className="truncate font-mono text-[8px] text-foreground">
                            {post.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-mono text-xs font-semibold tracking-widest">
                {editId ? "EDIT POST" : "SCHEDULE POST"}
              </h3>
              <button type="button" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Title"
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              />
              <textarea
                value={form.body}
                onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                placeholder="Body"
                rows={4}
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              />
              <select
                value={form.platform}
                onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              >
                {MKT_PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.label}
                  </option>
                ))}
              </select>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              >
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
              </select>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))}
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              />
              <input
                value={form.asset_url}
                onChange={(e) => setForm((p) => ({ ...p, asset_url: e.target.value }))}
                placeholder="Asset URL"
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              />
              <select
                value={form.campaign_id}
                onChange={(e) => setForm((p) => ({ ...p, campaign_id: e.target.value }))}
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              >
                <option value="">— No campaign —</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 font-mono text-[10px]"
                  disabled={saving}
                  onClick={() => void handleSave()}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "SAVE"}
                </Button>
                {editId && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500/40 font-mono text-[10px] text-red-400"
                    disabled={saving}
                    onClick={() => void handleDelete()}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
