"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { OsChangelogEntry } from "@/lib/queries"
import { CHANGELOG_CATEGORIES, changelogCategoryMeta } from "@/lib/mcu-handbook"
import { formatDate } from "@/lib/mcu-utils"

const EMPTY_FORM = {
  version: "",
  category: "feature",
  title: "",
  description: "",
  affects_gameplay: false,
}

function needsTruncate(text: string) {
  return text.length > 180 || text.split("\n").length > 3
}

export function ChangelogModule() {
  const [entries, setEntries] = useState<OsChangelogEntry[]>([])
  const [filter, setFilter] = useState<(typeof CHANGELOG_CATEGORIES)[number]>("ALL")
  const [gameplayOnly, setGameplayOnly] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filter !== "ALL") params.set("category", filter.toLowerCase())
      if (gameplayOnly) params.set("gameplayOnly", "true")

      const res = await fetch(`/api/mcu/changelog?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to load changelog")
      setEntries(json.entries ?? [])
      setCanEdit(json.canEdit ?? false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load changelog")
    } finally {
      setLoading(false)
    }
  }, [filter, gameplayOnly])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => entries, [entries])

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openCreate() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(entry: OsChangelogEntry) {
    setEditId(entry.id)
    setForm({
      version: entry.version,
      category: entry.category,
      title: entry.title,
      description: entry.description,
      affects_gameplay: entry.affects_gameplay,
    })
    setShowForm(true)
  }

  async function handlePublish() {
    if (!form.version.trim() || !form.title.trim() || !form.description.trim()) {
      setError("Version, title, and description required")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(editId ? `/api/mcu/changelog/${editId}` : "/api/mcu/changelog", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Publish failed")
      setEntries(json.entries ?? [])
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="shrink-0 border-b border-zinc-800/80 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-mono text-sm font-semibold tracking-widest">CHANGELOG</h1>
            <p className="font-mono text-[10px] text-muted-foreground">Internal release notes</p>
          </div>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-700 bg-transparent font-mono text-[10px]"
              onClick={openCreate}
            >
              + Add Entry
            </Button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {CHANGELOG_CATEGORIES.map((tab) => (
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
          <label className="ml-2 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            <input
              type="checkbox"
              checked={gameplayOnly}
              onChange={(e) => setGameplayOnly(e.target.checked)}
              className="rounded border-zinc-600"
            />
            Affects gameplay only
          </label>
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-[11px] text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-3 p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center font-mono text-[11px] text-muted-foreground">
            No changelog entries match filters
          </p>
        ) : (
          filtered.map((entry) => {
            const meta = changelogCategoryMeta(entry.category)
            const isExpanded = expanded.has(entry.id)
            const trunc = needsTruncate(entry.description) && !isExpanded
            return (
              <article
                key={entry.id}
                className="cursor-pointer rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-4 transition-colors hover:border-zinc-700"
                onClick={() => toggleExpand(entry.id)}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded border border-zinc-600 px-1.5 py-0.5 font-mono text-[9px] text-foreground">
                    v{entry.version}
                  </span>
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold",
                      meta.className,
                    )}
                  >
                    {meta.label}
                  </span>
                  <span className="font-mono text-[9px] text-muted-foreground">
                    {formatDate(entry.created_at)} · @{entry.author_username ?? "staff"}
                  </span>
                </div>
                <h3 className="font-mono text-sm font-semibold text-foreground">{entry.title}</h3>
                <p
                  className={cn(
                    "mt-1 whitespace-pre-wrap font-mono text-[11px] text-muted-foreground",
                    trunc && "line-clamp-3",
                  )}
                >
                  {entry.description}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {entry.affects_gameplay && (
                      <span className="font-mono text-[9px] text-amber-400">🎮 Affects gameplay</span>
                    )}
                    {needsTruncate(entry.description) && (
                      <span className="font-mono text-[9px] text-zinc-600">
                        {isExpanded ? "Click to collapse" : "Click to expand"}
                      </span>
                    )}
                  </div>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-zinc-700 bg-transparent font-mono text-[9px]"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEdit(entry)
                      }}
                    >
                      EDIT
                    </Button>
                  )}
                </div>
              </article>
            )
          })
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-mono text-xs font-semibold tracking-widest">
                {editId ? "EDIT ENTRY" : "ADD ENTRY"}
              </h3>
              <button type="button" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={form.version}
                onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))}
                placeholder="Version (e.g. 1.2.0)"
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              />
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              >
                {["feature", "bugfix", "economy", "urgent"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Title"
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Description"
                rows={5}
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 font-mono text-[11px] outline-none"
              />
              <label className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.affects_gameplay}
                  onChange={(e) => setForm((p) => ({ ...p, affects_gameplay: e.target.checked }))}
                />
                Affects gameplay
              </label>
              <Button
                size="sm"
                className="w-full font-mono text-[10px]"
                disabled={saving}
                onClick={() => void handlePublish()}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "PUBLISH"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
