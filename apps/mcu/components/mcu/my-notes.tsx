"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2, Pin, Plus, Search, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { renderBasicMarkdown } from "@/lib/mcu-markdown"
import type { OsNoteRow } from "@/lib/queries"
import { formatDateTime } from "@/lib/mcu-utils"

type SaveStatus = "saved" | "saving" | "unsaved"

export function MyNotesModule() {
  const [notes, setNotes] = useState<OsNoteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [preview, setPreview] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
  const [saving, setSaving] = useState(false)

  const snapshotRef = useRef({ title: "", body: "", tags: [] as string[] })
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadNotes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/mcu/notes")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to load notes")
      setNotes(json.notes ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadNotes()
  }, [loadNotes])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const note of notes) {
      for (const t of note.tags ?? []) set.add(t)
    }
    return [...set].sort()
  }, [notes])

  const filteredNotes = useMemo(() => {
    let list = [...notes]
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q) ||
          (n.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      )
    }
    if (tagFilter) {
      list = list.filter((n) => (n.tags ?? []).includes(tagFilter))
    }
    return list.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [notes, search, tagFilter])

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeId) ?? null,
    [notes, activeId],
  )

  function captureSnapshot(t: string, b: string, tg: string[]) {
    snapshotRef.current = { title: t, body: b, tags: tg }
    setSaveStatus("saved")
  }

  function isDirty() {
    const snap = snapshotRef.current
    return title !== snap.title || body !== snap.body || JSON.stringify(tags) !== JSON.stringify(snap.tags)
  }

  const saveNote = useCallback(
    async (manual = false) => {
      if (!activeId || saving) return
      if (!isDirty() && !manual) return

      setSaving(true)
      setSaveStatus("saving")
      setError(null)
      try {
        const res = await fetch(`/api/mcu/notes/${activeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim() || "Untitled",
            body,
            tags,
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? "Save failed")

        setNotes((prev) => prev.map((n) => (n.id === activeId ? json.note : n)))
        captureSnapshot(title.trim() || "Untitled", body, tags)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed")
        setSaveStatus("unsaved")
      } finally {
        setSaving(false)
      }
    },
    [activeId, body, saving, tags, title],
  )

  useEffect(() => {
    if (!activeId) return
    if (!isDirty()) return

    setSaveStatus("unsaved")
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(() => {
      void saveNote(false)
    }, 30_000)

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    }
  }, [activeId, title, body, tags, saveNote])

  async function openNote(note: OsNoteRow) {
    if (activeId && isDirty()) await saveNote(false)
    setActiveId(note.id)
    setTitle(note.title)
    setBody(note.body)
    setTags(note.tags ?? [])
    setPreview(false)
    captureSnapshot(note.title, note.body, note.tags ?? [])
  }

  async function createNote() {
    setError(null)
    try {
      const res = await fetch("/api/mcu/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled", body: "", tags: [] }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Create failed")
      setNotes((prev) => [json.note, ...prev])
      await openNote(json.note)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed")
    }
  }

  async function togglePin() {
    if (!activeId || !activeNote) return
    const next = !activeNote.is_pinned
    try {
      const res = await fetch(`/api/mcu/notes/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_pinned: next }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Pin failed")
      setNotes((prev) => prev.map((n) => (n.id === activeId ? json.note : n)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pin failed")
    }
  }

  async function deleteNote() {
    if (!activeId) return
    if (!confirm("Delete this note?")) return
    try {
      const res = await fetch(`/api/mcu/notes/${activeId}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Delete failed")
      setNotes((prev) => prev.filter((n) => n.id !== activeId))
      setActiveId(null)
      setTitle("")
      setBody("")
      setTags([])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    }
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (!t || tags.includes(t)) {
      setTagInput("")
      return
    }
    setTags((prev) => [...prev, t])
    setTagInput("")
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  const statusLabel =
    saveStatus === "saving" ? "Saving..." : saveStatus === "unsaved" ? "Unsaved changes" : "Saved"

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-zinc-800/80 px-4 py-3">
        <h1 className="font-mono text-sm font-semibold tracking-widest text-foreground">MY NOTES</h1>
        <p className="font-mono text-[10px] text-muted-foreground">Private staff notes · RLS protected</p>
      </header>

      {error && (
        <div className="mx-4 mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-[11px] text-red-400">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Left — list */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950/40">
          <div className="space-y-2 border-b border-zinc-800/60 p-3">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title or tags…"
                className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 py-1.5 pl-8 pr-2 font-mono text-[10px] outline-none focus:border-zinc-500"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full border-zinc-700 bg-transparent font-mono text-[10px]"
              onClick={() => void createNote()}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              New note
            </Button>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setTagFilter(null)}
                  className={cn(
                    "rounded-full border px-2 py-0.5 font-mono text-[9px]",
                    !tagFilter
                      ? "border-foreground bg-foreground text-background"
                      : "border-zinc-700 text-muted-foreground",
                  )}
                >
                  all
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                    className={cn(
                      "rounded-full border px-2 py-0.5 font-mono text-[9px]",
                      tagFilter === tag
                        ? "border-foreground bg-foreground text-background"
                        : "border-zinc-700 text-muted-foreground",
                    )}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredNotes.length === 0 ? (
              <p className="px-3 py-4 font-mono text-[10px] text-muted-foreground">No notes</p>
            ) : (
              filteredNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => void openNote(note)}
                  className={cn(
                    "block w-full border-b border-zinc-800/40 px-3 py-2.5 text-left transition-colors",
                    activeId === note.id ? "bg-zinc-800/80" : "hover:bg-zinc-900/60",
                  )}
                >
                  <div className="flex items-center gap-1">
                    {note.is_pinned && <Pin className="h-3 w-3 text-amber-400" />}
                    <span className="truncate font-mono text-[11px] font-semibold text-foreground">
                      {note.title}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[9px] text-muted-foreground">
                    {note.body.slice(0, 80) || "Empty note"}
                  </p>
                  <p className="mt-1 font-mono text-[8px] text-zinc-600">
                    {formatDateTime(note.updated_at)}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right — editor */}
        <section className="flex min-w-0 flex-1 flex-col">
          {!activeId ? (
            <div className="flex flex-1 items-center justify-center font-mono text-[11px] text-muted-foreground">
              Select or create a note
            </div>
          ) : (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800/60 px-4 py-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1 bg-transparent font-mono text-base font-semibold text-foreground outline-none"
                  placeholder="Untitled"
                />
                <span
                  className={cn(
                    "font-mono text-[9px]",
                    saveStatus === "saved"
                      ? "text-emerald-400"
                      : saveStatus === "saving"
                        ? "text-yellow-400"
                        : "text-amber-400",
                  )}
                >
                  {statusLabel}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 border-zinc-700 bg-transparent font-mono text-[10px]"
                  disabled={saving}
                  onClick={() => void saveNote(true)}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 border-zinc-700 bg-transparent font-mono text-[10px]"
                  onClick={() => void togglePin()}
                >
                  {activeNote?.is_pinned ? "Unpin" : "Pin"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 border-red-500/40 bg-transparent font-mono text-[10px] text-red-400"
                  onClick={() => void deleteNote()}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-800/40 px-4 py-2">
                {(tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-2 py-0.5 font-mono text-[9px] text-muted-foreground"
                  >
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} className="text-zinc-500">
                      ×
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  placeholder="Add tag + Enter"
                  className="min-w-[120px] flex-1 bg-transparent font-mono text-[10px] outline-none"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 font-mono text-[10px]"
                  onClick={() => setPreview((v) => !v)}
                >
                  {preview ? "Edit" : "Preview"}
                </Button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {preview ? (
                  <div
                    className="prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderBasicMarkdown(body) }}
                  />
                ) : (
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="h-full min-h-[320px] w-full resize-none bg-transparent font-mono text-[12px] leading-relaxed text-foreground outline-none"
                    placeholder="Write in markdown…"
                  />
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
