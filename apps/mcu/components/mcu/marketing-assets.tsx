"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { MktAsset } from "@/lib/queries"
import { ASSET_TYPE_FILTERS } from "@/lib/mcu-marketing"

const EMPTY_FORM = {
  name: "",
  type: "banner",
  url: "",
  tags: "",
  version: "1.0",
}

export function MarketingAssetsModule() {
  const [assets, setAssets] = useState<MktAsset[]>([])
  const [canApprove, setCanApprove] = useState(false)
  const [filter, setFilter] = useState<(typeof ASSET_TYPE_FILTERS)[number]>("ALL")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/mcu/marketing/assets")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to load assets")
      setAssets(json.assets ?? [])
      setCanApprove(json.canApprove ?? false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assets")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return assets.filter((a) => {
      if (filter !== "ALL" && (a.type ?? "").toLowerCase() !== filter.toLowerCase()) return false
      if (!q) return true
      const tags = (a.tags ?? []).join(" ").toLowerCase()
      return (a.name ?? "").toLowerCase().includes(q) || tags.includes(q)
    })
  }, [assets, filter, search])

  async function handleUpload() {
    if (!form.name.trim() || !form.url.trim()) {
      setError("Name and URL required")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const tags = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
      const res = await fetch("/api/mcu/marketing/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tags }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Upload failed")
      setAssets(json.assets ?? [])
      setShowUpload(false)
      setForm(EMPTY_FORM)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleApprove(id: string) {
    setError(null)
    try {
      const res = await fetch("/api/mcu/marketing/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "approve" }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Approve failed")
      setAssets(json.assets ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed")
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="shrink-0 border-b border-zinc-800/80 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-mono text-sm font-semibold tracking-widest">CREATIVE ASSETS</h1>
            <p className="font-mono text-[10px] text-muted-foreground">Marketing asset library</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-zinc-700 bg-transparent font-mono text-[10px]"
            onClick={() => setShowUpload(true)}
          >
            Upload Asset
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {ASSET_TYPE_FILTERS.map((tab) => (
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
        <div className="relative mt-3">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or tags…"
            className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 py-1.5 pl-8 pr-2 font-mono text-[10px] outline-none"
          />
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-[11px] text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="col-span-full py-8 text-center font-mono text-[11px] text-muted-foreground">
            No assets
          </p>
        ) : (
          filtered.map((a) => {
            const isVideo =
              (a.type ?? "").toLowerCase() === "video" || /\.(mp4|webm)(\?|$)/i.test(a.url)
            return (
              <article
                key={a.id}
                className="overflow-hidden rounded-lg border border-zinc-800/60 bg-zinc-950/40"
              >
                <div className="flex aspect-video items-center justify-center bg-zinc-900/60">
                  {isVideo ? (
                    <span className="text-2xl">🎬</span>
                  ) : a.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span className="text-2xl">📁</span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="truncate font-mono text-[11px] font-semibold text-foreground">
                    {a.name}
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-2 font-mono text-[9px] text-muted-foreground">
                    <span className="uppercase">{(a.type ?? "other").toUpperCase()}</span>
                    <span>v{a.version}</span>
                    <span>{a.approved ? "✅ Approved" : "⏳ Pending"}</span>
                  </div>
                  <div className="mt-2 flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-zinc-700 bg-transparent font-mono text-[9px]"
                      onClick={() => window.open(a.url, "_blank")}
                    >
                      Open
                    </Button>
                    {canApprove && !a.approved && (
                      <Button
                        size="sm"
                        className="h-7 bg-amber-500/90 font-mono text-[9px] text-black hover:bg-amber-400"
                        onClick={() => void handleApprove(a.id)}
                      >
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-950 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-mono text-xs font-semibold tracking-widest">UPLOAD ASSET</h3>
              <button type="button" onClick={() => setShowUpload(false)}>
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
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              >
                {["banner", "template", "logo", "video", "other"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                value={form.url}
                onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                placeholder="Asset URL"
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              />
              <input
                value={form.tags}
                onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                placeholder="Tags (comma separated)"
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              />
              <input
                value={form.version}
                onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))}
                placeholder="Version"
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              />
              <Button
                size="sm"
                className="w-full font-mono text-[10px]"
                disabled={saving}
                onClick={() => void handleUpload()}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
