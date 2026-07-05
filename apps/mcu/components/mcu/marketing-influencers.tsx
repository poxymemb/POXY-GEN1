"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { MktInfluencer } from "@/lib/queries"
import {
  INFLUENCER_STATUS_FILTERS,
  MKT_PLATFORMS,
  influencerStatusClass,
  platformLabel,
} from "@/lib/mcu-marketing"

const EMPTY_FORM = {
  name: "",
  platform: "tiktok",
  handle: "",
  followers_count: "",
  niche: "",
  status: "prospect",
  notes: "",
  deal_terms: "",
  result_notes: "",
}

export function MarketingInfluencersModule() {
  const [influencers, setInfluencers] = useState<MktInfluencer[]>([])
  const [filter, setFilter] = useState<(typeof INFLUENCER_STATUS_FILTERS)[number]>("ALL")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const status = filter === "ALL" ? "all" : filter.toLowerCase()
      const res = await fetch(`/api/mcu/marketing/influencers?status=${status}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to load influencers")
      setInfluencers(json.influencers ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load influencers")
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    if (filter === "ALL") return influencers
    return influencers.filter((i) => (i.status ?? "prospect").toLowerCase() === filter.toLowerCase())
  }, [influencers, filter])

  function openAdd() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(row: MktInfluencer) {
    setEditId(row.id)
    setForm({
      name: row.name,
      platform: row.platform,
      handle: row.handle ?? "",
      followers_count: row.followers_count != null ? String(row.followers_count) : "",
      niche: row.niche ?? "",
      status: row.status ?? "prospect",
      notes: row.notes ?? "",
      deal_terms: row.deal_terms ?? "",
      result_notes: row.result_notes ?? "",
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Name required")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: form.name.trim(),
        platform: form.platform,
        handle: form.handle.trim() || null,
        followers_count: form.followers_count ? parseInt(form.followers_count, 10) : null,
        niche: form.niche.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
        deal_terms: form.deal_terms.trim() || null,
        result_notes: form.result_notes.trim() || null,
      }
      const res = await fetch("/api/mcu/marketing/influencers", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? { id: editId, ...payload } : payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Save failed")
      setInfluencers(json.influencers ?? [])
      setShowModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editId || !confirm("Delete this influencer?")) return
    setSaving(true)
    try {
      const res = await fetch(`/api/mcu/marketing/influencers?id=${editId}`, { method: "DELETE" })
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
            <h1 className="font-mono text-sm font-semibold tracking-widest">INFLUENCER TRACKER</h1>
            <p className="font-mono text-[10px] text-muted-foreground">Partnership pipeline</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-zinc-700 bg-transparent font-mono text-[10px]"
            onClick={openAdd}
          >
            + Add Influencer
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {INFLUENCER_STATUS_FILTERS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={cn(
                "rounded-md border px-2 py-1 font-mono text-[9px]",
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

      <div className="overflow-x-auto p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="w-full min-w-[640px] font-mono text-[11px]">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-[9px] tracking-widest text-muted-foreground">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Platform</th>
                <th className="pb-2 pr-4">Followers</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2">Result notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No influencers
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-zinc-900/60 hover:bg-zinc-900/40"
                    onClick={() => openEdit(row)}
                  >
                    <td className="py-2 pr-4">
                      <strong className="text-foreground">{row.name}</strong>
                      {row.handle && (
                        <div className="text-[10px] text-muted-foreground">{row.handle}</div>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {platformLabel(row.platform)}
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-foreground">
                      {row.followers_count != null
                        ? row.followers_count.toLocaleString()
                        : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={cn(
                          "rounded-[3px] border px-1.5 py-0.5 text-[9px] uppercase",
                          influencerStatusClass(row.status),
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate py-2 text-muted-foreground">
                      {row.result_notes || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-mono text-xs font-semibold tracking-widest">
                {editId ? "EDIT INFLUENCER" : "ADD INFLUENCER"}
              </h3>
              <button type="button" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Name"
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
              <input
                value={form.handle}
                onChange={(e) => setForm((p) => ({ ...p, handle: e.target.value }))}
                placeholder="Handle"
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              />
              <input
                type="number"
                value={form.followers_count}
                onChange={(e) => setForm((p) => ({ ...p, followers_count: e.target.value }))}
                placeholder="Followers count"
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              />
              <input
                value={form.niche}
                onChange={(e) => setForm((p) => ({ ...p, niche: e.target.value }))}
                placeholder="Niche"
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              />
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              >
                {INFLUENCER_STATUS_FILTERS.filter((s) => s !== "ALL").map((s) => (
                  <option key={s} value={s.toLowerCase()}>
                    {s}
                  </option>
                ))}
              </select>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Notes"
                rows={2}
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              />
              <textarea
                value={form.deal_terms}
                onChange={(e) => setForm((p) => ({ ...p, deal_terms: e.target.value }))}
                placeholder="Deal terms"
                rows={2}
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              />
              <textarea
                value={form.result_notes}
                onChange={(e) => setForm((p) => ({ ...p, result_notes: e.target.value }))}
                placeholder="Result notes"
                rows={2}
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 font-mono text-[10px]"
                  disabled={saving}
                  onClick={() => void handleSave()}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
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
