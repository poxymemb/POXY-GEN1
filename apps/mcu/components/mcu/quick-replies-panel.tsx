"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { QuickReplyRow } from "@/lib/queries"

const CATEGORY_TABS = [
  { id: "all", label: "ALL" },
  { id: "technical", label: "TECHNICAL" },
  { id: "economy", label: "ECONOMY" },
  { id: "marketplace", label: "MARKETPLACE" },
  { id: "general", label: "GENERAL" },
  { id: "refusals", label: "REFUSALS" },
] as const

const CATEGORY_OPTIONS = CATEGORY_TABS.filter((c) => c.id !== "all")

type QuickRepliesPanelProps = {
  onInsert: (text: string) => void
  disabled?: boolean
}

export function QuickRepliesPanel({ onInsert, disabled }: QuickRepliesPanelProps) {
  const [category, setCategory] = useState<string>("all")
  const [replies, setReplies] = useState<QuickReplyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editReply, setEditReply] = useState<QuickReplyRow | null>(null)
  const [formTitle, setFormTitle] = useState("")
  const [formBody, setFormBody] = useState("")
  const [formCategory, setFormCategory] = useState("general")

  const loadReplies = useCallback(async (cat?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      const active = cat ?? category
      if (active !== "all") params.set("category", active)

      const res = await fetch(`/api/mcu/quick-replies?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load quick replies")
      setReplies(data.replies ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quick replies")
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    void loadReplies(category)
  }, [category, loadReplies])

  const visibleReplies = useMemo(() => {
    if (category === "all") return replies
    return replies.filter((r) => r.category === category)
  }, [category, replies])

  function openAddForm() {
    setEditReply(null)
    setFormTitle("")
    setFormBody("")
    setFormCategory(category === "all" ? "general" : category)
    setShowAddForm(true)
  }

  function openEditForm(reply: QuickReplyRow) {
    setEditReply(reply)
    setFormTitle(reply.title)
    setFormBody(reply.body)
    setFormCategory(reply.category || "general")
    setShowAddForm(true)
  }

  function closeForm() {
    setShowAddForm(false)
    setEditReply(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!formTitle.trim() || !formBody.trim()) return

    setSaving(true)
    setError(null)
    try {
      const payload = {
        title: formTitle.trim(),
        body: formBody.trim(),
        category: formCategory,
      }

      const res = await fetch(
        editReply ? `/api/mcu/quick-replies/${editReply.id}` : "/api/mcu/quick-replies",
        {
          method: editReply ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Save failed")

      setReplies(data.replies ?? [])
      closeForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(reply: QuickReplyRow) {
    if (!window.confirm(`Delete quick reply "${reply.title}"?`)) return

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/mcu/quick-replies/${reply.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Delete failed")
      setReplies(data.replies ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-t border-border px-5 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Quick Replies
        </p>
        <Button variant="outline" size="xs" onClick={openAddForm} disabled={disabled || saving}>
          <Plus className="size-3" /> Add Reply
        </Button>
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCategory(tab.id)}
            className={cn(
              "rounded-[3px] border px-2 py-0.5 font-mono text-[9px] font-semibold tracking-widest transition-colors",
              category === tab.id
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground/30",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-2 font-mono text-[10px] text-destructive">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 py-2 text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          <span className="font-mono text-[10px]">Loading…</span>
        </div>
      ) : visibleReplies.length === 0 ? (
        <p className="py-2 font-mono text-[10px] text-muted-foreground">No quick replies in this category.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {visibleReplies.map((reply) => (
            <div key={reply.id} className="group flex max-w-full items-stretch">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onInsert(reply.body)}
                title={reply.body}
                className="max-w-[220px] truncate rounded-l-md border border-r-0 border-border bg-background/60 px-2.5 py-1 font-mono text-[10px] text-foreground transition-colors hover:border-foreground/30 hover:bg-sidebar-accent/50 disabled:opacity-50"
              >
                {reply.title}
              </button>
              <button
                type="button"
                disabled={disabled || saving}
                onClick={() => openEditForm(reply)}
                className="border border-r-0 border-border bg-background/40 px-1.5 py-1 text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground disabled:opacity-50"
                title="Edit"
              >
                <Pencil className="size-3" />
              </button>
              <button
                type="button"
                disabled={disabled || saving}
                onClick={() => void handleDelete(reply)}
                className="rounded-r-md border border-border bg-background/40 px-1.5 py-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                title="Delete"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={(e) => void handleSave(e)}
            className="w-full max-w-md rounded-lg border border-border bg-background p-4 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-foreground">
                {editReply ? "Edit Quick Reply" : "Add Quick Reply"}
              </h3>
              <button type="button" onClick={closeForm} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>

            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Title"
              className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground/30"
            />
            <textarea
              value={formBody}
              onChange={(e) => setFormBody(e.target.value)}
              rows={4}
              placeholder="Reply body"
              className="mb-2 w-full resize-none rounded-md border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground/30"
            />
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="mb-3 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground/30"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={closeForm}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving || !formTitle.trim() || !formBody.trim()}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
