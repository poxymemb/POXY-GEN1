"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AutoMessageRow, FaqRow } from "@/lib/queries"

const AUTO_TRIGGERS = [
  { key: "ticket_created", label: "Ticket Created" },
  { key: "ticket_closed", label: "Ticket Closed" },
  { key: "ticket_escalated", label: "Ticket Escalated" },
] as const

type AutoMessageView = {
  trigger: string
  label: string
  id: string | null
  body: string
  is_active: boolean
}

export function FaqManagerModule() {
  const [faqEntries, setFaqEntries] = useState<FaqRow[]>([])
  const [autoMessages, setAutoMessages] = useState<AutoMessageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFaqForm, setShowFaqForm] = useState(false)
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null)
  const [faqQuestion, setFaqQuestion] = useState("")
  const [faqAnswer, setFaqAnswer] = useState("")
  const [faqCategory, setFaqCategory] = useState("general")
  const [faqPublished, setFaqPublished] = useState(true)
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)
  const [autoDrafts, setAutoDrafts] = useState<Record<string, string>>({})
  const [previewTrigger, setPreviewTrigger] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [faqRes, autoRes] = await Promise.all([
        fetch("/api/mcu/faq"),
        fetch("/api/mcu/auto-messages"),
      ])
      const faqData = await faqRes.json()
      const autoData = await autoRes.json()
      if (!faqRes.ok) throw new Error(faqData.error ?? "Failed to load FAQ")
      if (!autoRes.ok) throw new Error(autoData.error ?? "Failed to load auto messages")

      setFaqEntries(faqData.entries ?? [])
      const messages = autoData.messages ?? []
      setAutoMessages(messages)

      const drafts: Record<string, string> = {}
      for (const trigger of AUTO_TRIGGERS) {
        const row = messages.find((m: AutoMessageRow) => m.trigger === trigger.key)
        drafts[trigger.key] = row?.body ?? ""
      }
      setAutoDrafts(drafts)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load FAQ manager")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const autoViews = useMemo<AutoMessageView[]>(() => {
    return AUTO_TRIGGERS.map((trigger) => {
      const row = autoMessages.find((m) => m.trigger === trigger.key)
      return {
        trigger: trigger.key,
        label: trigger.label,
        id: row?.id ?? null,
        body: autoDrafts[trigger.key] ?? row?.body ?? "",
        is_active: row?.is_active ?? false,
      }
    })
  }, [autoMessages, autoDrafts])

  function openFaqForm(entry?: FaqRow) {
    if (entry) {
      setEditingFaqId(entry.id)
      setFaqQuestion(entry.question)
      setFaqAnswer(entry.answer)
      setFaqCategory(entry.category)
      setFaqPublished(entry.is_active)
    } else {
      setEditingFaqId(null)
      setFaqQuestion("")
      setFaqAnswer("")
      setFaqCategory("general")
      setFaqPublished(true)
    }
    setShowFaqForm(true)
  }

  async function saveFaq(e: React.FormEvent) {
    e.preventDefault()
    if (!faqQuestion.trim() || !faqAnswer.trim()) return

    setSaving(true)
    setError(null)
    try {
      const payload = {
        question: faqQuestion.trim(),
        answer: faqAnswer.trim(),
        category: faqCategory.trim() || "general",
        is_published: faqPublished,
      }

      const res = await fetch(editingFaqId ? `/api/mcu/faq/${editingFaqId}` : "/api/mcu/faq", {
        method: editingFaqId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Save failed")

      setFaqEntries(data.entries ?? [])
      setShowFaqForm(false)
      setEditingFaqId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function deleteFaq(id: string) {
    if (!window.confirm("Delete this FAQ entry?")) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/mcu/faq/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Delete failed")
      setFaqEntries(data.entries ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setSaving(false)
    }
  }

  async function reorderFaq(id: string, direction: "up" | "down") {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/mcu/faq/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reorder: direction }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Reorder failed")
      setFaqEntries(data.entries ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reorder failed")
    } finally {
      setSaving(false)
    }
  }

  async function toggleAutoActive(view: AutoMessageView) {
    if (!view.id) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/mcu/auto-messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: view.id, is_active: !view.is_active }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Toggle failed")
      setAutoMessages(data.messages ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toggle failed")
    } finally {
      setSaving(false)
    }
  }

  async function saveAutoBody(view: AutoMessageView) {
    const body = autoDrafts[view.trigger]?.trim()
    if (!body) {
      setError("Auto message body cannot be empty")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload = view.id
        ? { id: view.id, body }
        : { trigger: view.trigger, body, is_active: true }

      const res = await fetch("/api/mcu/auto-messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Save failed")
      setAutoMessages(data.messages ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border px-5 py-3">
        <h1 className="font-mono text-sm font-semibold uppercase tracking-widest text-foreground">
          FAQ & Auto Messages
        </h1>
        <p className="font-mono text-[10px] text-muted-foreground">POXY WORLD // Support Content</p>
      </header>

      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-2 font-mono text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-10">
            <section>
              <h2 className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-widest text-foreground">
                Auto Messages
              </h2>
              <div className="space-y-4">
                {autoViews.map((view) => (
                  <div key={view.trigger} className="rounded-lg border border-border bg-zinc-950/40 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs font-semibold text-foreground">{view.label}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{view.trigger}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={view.is_active}
                            disabled={!view.id || saving}
                            onChange={() => void toggleAutoActive(view)}
                          />
                          Active
                        </label>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setPreviewTrigger(previewTrigger === view.trigger ? null : view.trigger)}
                        >
                          Preview
                        </Button>
                        <Button
                          size="xs"
                          disabled={saving}
                          onClick={() => void saveAutoBody(view)}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                    <textarea
                      value={autoDrafts[view.trigger] ?? ""}
                      onChange={(e) =>
                        setAutoDrafts((prev) => ({ ...prev, [view.trigger]: e.target.value }))
                      }
                      rows={3}
                      placeholder="Message shown to the player…"
                      className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/30"
                      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                    />
                    {previewTrigger === view.trigger && (
                      <div className="mt-3 rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3">
                        <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-zinc-500">
                          Player preview
                        </p>
                        <p
                          className="text-sm italic text-zinc-400"
                          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                        >
                          {autoDrafts[view.trigger] || "—"}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="font-mono text-[11px] font-semibold uppercase tracking-widest text-foreground">
                  FAQ
                </h2>
                <Button variant="outline" size="xs" onClick={() => openFaqForm()}>
                  <Plus className="size-3" /> Add FAQ
                </Button>
              </div>

              {showFaqForm && (
                <form onSubmit={(e) => void saveFaq(e)} className="mb-4 rounded-lg border border-border bg-background/40 p-4">
                  <input
                    value={faqQuestion}
                    onChange={(e) => setFaqQuestion(e.target.value)}
                    placeholder="Question"
                    className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/30"
                  />
                  <textarea
                    value={faqAnswer}
                    onChange={(e) => setFaqAnswer(e.target.value)}
                    rows={3}
                    placeholder="Answer"
                    className="mb-2 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/30"
                  />
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <input
                      value={faqCategory}
                      onChange={(e) => setFaqCategory(e.target.value)}
                      placeholder="Category"
                      className="rounded-md border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground/30"
                    />
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={faqPublished}
                        onChange={(e) => setFaqPublished(e.target.checked)}
                      />
                      Published
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={saving}>
                      {saving ? <Loader2 className="size-3.5 animate-spin" /> : "Save FAQ"}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowFaqForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {faqEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No FAQ entries yet.</p>
              ) : (
                <div className="space-y-2">
                  {faqEntries.map((entry, index) => (
                    <div key={entry.id} className="rounded-lg border border-border bg-zinc-950/30">
                      <button
                        type="button"
                        onClick={() => setExpandedFaq(expandedFaq === entry.id ? null : entry.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left"
                      >
                        {expandedFaq === entry.id ? (
                          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{entry.question}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {entry.category} · {entry.is_active ? "Published" : "Draft"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={saving || index === 0}
                            onClick={(e) => {
                              e.stopPropagation()
                              void reorderFaq(entry.id, "up")
                            }}
                          >
                            <ArrowUp className="size-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={saving || index === faqEntries.length - 1}
                            onClick={(e) => {
                              e.stopPropagation()
                              void reorderFaq(entry.id, "down")
                            }}
                          >
                            <ArrowDown className="size-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={saving}
                            onClick={(e) => {
                              e.stopPropagation()
                              openFaqForm(entry)
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={saving}
                            onClick={(e) => {
                              e.stopPropagation()
                              void deleteFaq(entry.id)
                            }}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </button>
                      {expandedFaq === entry.id && (
                        <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
                          {entry.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
