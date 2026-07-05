"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { MktCampaign } from "@/lib/queries"
import {
  CAMPAIGN_STATUS_TABS,
  MKT_PLATFORMS,
  campaignStatusClass,
  formatShortDate,
  platformIcon,
  platformLabel,
} from "@/lib/mcu-marketing"

const EMPTY_FORM = {
  name: "",
  description: "",
  status: "draft",
  platform: [] as string[],
  start_date: "",
  end_date: "",
  goal: "",
  budget_pc: 0,
  result_notes: "",
}

export function MarketingCampaignsModule() {
  const [campaigns, setCampaigns] = useState<MktCampaign[]>([])
  const [filter, setFilter] = useState<(typeof CAMPAIGN_STATUS_TABS)[number]>("ALL")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const status = filter === "ALL" ? "all" : filter.toLowerCase()
      const res = await fetch(`/api/mcu/marketing/campaigns?status=${status}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to load campaigns")
      setCampaigns(json.campaigns ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaigns")
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    if (filter === "ALL") return campaigns
    return campaigns.filter((c) => (c.status ?? "draft").toLowerCase() === filter.toLowerCase())
  }, [campaigns, filter])

  function togglePlatform(id: string) {
    setForm((prev) => ({
      ...prev,
      platform: prev.platform.includes(id)
        ? prev.platform.filter((p) => p !== id)
        : [...prev.platform, id],
    }))
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      setError("Campaign name required")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/mcu/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Create failed")
      setCampaigns(json.campaigns ?? [])
      setShowCreate(false)
      setForm(EMPTY_FORM)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed")
    } finally {
      setSaving(false)
    }
  }

  function openEdit(c: MktCampaign) {
    setEditId(c.id)
    setForm({
      name: c.name,
      description: c.description ?? "",
      status: c.status ?? "draft",
      platform: c.platform ?? [],
      start_date: c.start_date ?? "",
      end_date: c.end_date ?? "",
      goal: c.goal ?? "",
      budget_pc: c.budget_pc ?? 0,
      result_notes: c.result_notes ?? "",
    })
    setShowEdit(true)
  }

  async function handleSaveEdit() {
    if (!editId || !form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/mcu/marketing/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, action: "update", ...form }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Save failed")
      setCampaigns(json.campaigns ?? [])
      setShowEdit(false)
      setEditId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handlePause(id: string) {
    setError(null)
    try {
      const res = await fetch("/api/mcu/marketing/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "pause" }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Toggle failed")
      setCampaigns(json.campaigns ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toggle failed")
    }
  }

  function CampaignForm({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) {
    return (
      <div className="space-y-3">
        <input
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Campaign name"
          className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none focus:border-zinc-500"
        />
        <textarea
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="Description"
          rows={3}
          className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none focus:border-zinc-500"
        />
        <select
          value={form.status}
          onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
          className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
        >
          {["draft", "active", "paused", "completed"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          {MKT_PLATFORMS.map((p) => (
            <label
              key={p.id}
              className={cn(
                "flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px]",
                form.platform.includes(p.id)
                  ? "border-foreground bg-foreground text-background"
                  : "border-zinc-700 text-muted-foreground",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={form.platform.includes(p.id)}
                onChange={() => togglePlatform(p.id)}
              />
              {p.icon} {p.label}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
            className="rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
          />
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
            className="rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
          />
        </div>
        <input
          value={form.goal}
          onChange={(e) => setForm((p) => ({ ...p, goal: e.target.value }))}
          placeholder="Goal"
          className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
        />
        <input
          type="number"
          value={form.budget_pc}
          onChange={(e) => setForm((p) => ({ ...p, budget_pc: parseInt(e.target.value, 10) || 0 }))}
          placeholder="Budget PC"
          className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
        />
        <textarea
          value={form.result_notes}
          onChange={(e) => setForm((p) => ({ ...p, result_notes: e.target.value }))}
          placeholder="Result notes"
          rows={2}
          className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
        />
        <Button
          size="sm"
          className="w-full font-mono text-[10px]"
          disabled={saving}
          onClick={onSubmit}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="shrink-0 border-b border-zinc-800/80 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-mono text-sm font-semibold tracking-widest">CAMPAIGNS</h1>
            <p className="font-mono text-[10px] text-muted-foreground">Marketing campaign tracker</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-zinc-700 bg-transparent font-mono text-[10px]"
            onClick={() => {
              setForm(EMPTY_FORM)
              setShowCreate(true)
            }}
          >
            + New Campaign
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {CAMPAIGN_STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={cn(
                "rounded-md border px-2 py-1 font-mono text-[9px] tracking-widest",
                filter === tab
                  ? "border-foreground bg-foreground text-background"
                  : "border-zinc-700 text-muted-foreground",
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-[11px] text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="col-span-full py-8 text-center font-mono text-[11px] text-muted-foreground">
            No campaigns
          </p>
        ) : (
          filtered.map((c) => {
            const expanded = expandedId === c.id
            const pauseLabel =
              c.status === "active" ? "Pause" : c.status === "paused" ? "Resume" : null
            return (
              <article
                key={c.id}
                className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-mono text-sm font-semibold text-foreground">{c.name}</h3>
                  <span
                    className={cn(
                      "rounded-[3px] border px-1.5 py-0.5 font-mono text-[9px] uppercase",
                      campaignStatusClass(c.status),
                    )}
                  >
                    {c.status}
                  </span>
                </div>
                <div className="mb-2 flex gap-1 text-base">
                  {(c.platform ?? []).length ? (
                    c.platform.map((p) => (
                      <span key={p} title={platformLabel(p)}>
                        {platformIcon(p)}
                      </span>
                    ))
                  ) : (
                    <span className="font-mono text-[10px] text-muted-foreground">No platforms</span>
                  )}
                </div>
                <div className="space-y-1 font-mono text-[10px] text-muted-foreground">
                  <p>
                    📅 {formatShortDate(c.start_date)} → {formatShortDate(c.end_date)}
                  </p>
                  <p>💰 {c.budget_pc ?? 0} PC</p>
                  <p>🎯 {c.goal || "—"}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 border-zinc-700 bg-transparent font-mono text-[9px]"
                    onClick={() => setExpandedId(expanded ? null : c.id)}
                  >
                    VIEW
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 border-zinc-700 bg-transparent font-mono text-[9px]"
                    onClick={() => openEdit(c)}
                  >
                    EDIT
                  </Button>
                  {pauseLabel && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-zinc-700 bg-transparent font-mono text-[9px]"
                      onClick={() => void handlePause(c.id)}
                    >
                      {pauseLabel}
                    </Button>
                  )}
                </div>
                {expanded && (
                  <div className="mt-3 space-y-2 border-t border-zinc-800/60 pt-3 font-mono text-[10px] text-muted-foreground">
                    <p>
                      <span className="text-zinc-500">Description:</span> {c.description || "—"}
                    </p>
                    <p>
                      <span className="text-zinc-500">Result notes:</span> {c.result_notes || "—"}
                    </p>
                  </div>
                )}
              </article>
            )
          })
        )}
      </div>

      {(showCreate || showEdit) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-mono text-xs font-semibold tracking-widest">
                {showEdit ? "EDIT CAMPAIGN" : "NEW CAMPAIGN"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false)
                  setShowEdit(false)
                }}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <CampaignForm
              onSubmit={() => void (showEdit ? handleSaveEdit() : handleCreate())}
              submitLabel={showEdit ? "SAVE" : "CREATE"}
            />
          </div>
        </div>
      )}
    </div>
  )
}
