"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import type { OsTask } from "@/lib/queries"
import type { StaffMember } from "@/lib/queries"
import { formatDateTime } from "@/lib/mcu-utils"

const PRIORITY_META: Record<string, { label: string; className: string }> = {
  urgent: { label: "🔴 URGENT", className: "border-red-500/40 bg-red-500/10 text-red-400" },
  high: { label: "🟠 HIGH", className: "border-orange-500/40 bg-orange-500/10 text-orange-400" },
  normal: { label: "🟡 NORMAL", className: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400" },
  low: { label: "🟢 LOW", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" },
}

const STATUSES = ["todo", "in_progress", "review", "done"] as const
const DEPARTMENTS = ["support", "tech", "marketing", "all"] as const

type TaskDetailModalProps = {
  taskId: string | null
  onClose: () => void
  onUpdated: () => void
  staff?: StaffMember[]
}

export function TaskDetailModal({ taskId, onClose, onUpdated, staff = [] }: TaskDetailModalProps) {
  const [task, setTask] = useState<OsTask | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [comment, setComment] = useState("")
  const [newSubtask, setNewSubtask] = useState("")

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("normal")
  const [status, setStatus] = useState("todo")
  const [department, setDepartment] = useState("support")
  const [assignedTo, setAssignedTo] = useState("")
  const [dueDate, setDueDate] = useState("")

  const loadTask = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/mcu/tasks/${id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load task")
      setTask(data.task)
      setTitle(data.task.title)
      setDescription(data.task.description ?? "")
      setPriority(data.task.priority)
      setStatus(data.task.status)
      setDepartment(data.task.department ?? "support")
      setAssignedTo(data.task.assigned_to ?? "")
      setDueDate(data.task.due_date ?? "")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load task")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (taskId) void loadTask(taskId)
    else setTask(null)
  }, [taskId, loadTask])

  useEffect(() => {
    if (!taskId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`task-comments-${taskId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "os_task_comments", filter: `task_id=eq.${taskId}` },
        () => {
          void loadTask(taskId)
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [taskId, loadTask])

  async function patch(body: Record<string, unknown>) {
    if (!taskId) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/mcu/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Update failed")
      setTask(data.task)
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    await patch({
      title,
      description,
      priority,
      status,
      department,
      assigned_to: assignedTo || null,
      due_date: dueDate || null,
    })
  }

  async function handleMarkDone() {
    await patch({ status: "done" })
    onClose()
  }

  async function handleDelete() {
    if (!taskId || !window.confirm("Delete this task and all subtasks/comments?")) return
    setSaving(true)
    try {
      const res = await fetch(`/api/mcu/tasks/${taskId}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Delete failed")
      }
      onUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setSaving(false)
    }
  }

  if (!taskId) return null

  const pri = PRIORITY_META[priority] ?? PRIORITY_META.normal
  const assigneeOptions = staff.filter((m) => m.profiles?.id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className={cn("rounded-[3px] border px-1.5 py-0.5 font-mono text-[9px] font-semibold", pri.className)}>
            {pri.label}
          </span>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : task ? (
            <div className="space-y-4">
              {error && <p className="font-mono text-xs text-destructive">{error}</p>}

              <div>
                <label className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground/30"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <FieldSelect label="Priority" value={priority} onChange={setPriority} options={Object.keys(PRIORITY_META)} />
                <FieldSelect label="Department" value={department} onChange={setDepartment} options={[...DEPARTMENTS]} />
                <FieldSelect label="Status" value={status} onChange={setStatus} options={[...STATUSES]} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    Assignee
                  </label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-2 py-2 font-mono text-xs"
                  >
                    <option value="">Unassigned</option>
                    {assigneeOptions.map((m) => (
                      <option key={m.profiles!.id} value={m.profiles!.id}>
                        @{m.profiles!.username ?? m.email.split("@")[0]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    Due date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-2 py-2 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground/30"
                />
              </div>

              <div>
                <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Subtasks
                </p>
                <div className="space-y-2">
                  {task.os_task_subtasks
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((sub) => (
                      <label key={sub.id} className="flex items-center gap-2 font-mono text-xs text-foreground">
                        <input
                          type="checkbox"
                          checked={sub.completed}
                          onChange={(e) =>
                            void patch({ toggle_subtask: { id: sub.id, completed: e.target.checked } }).then(() =>
                              loadTask(taskId),
                            )
                          }
                        />
                        <span className={sub.completed ? "text-muted-foreground line-through" : ""}>{sub.title}</span>
                      </label>
                    ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    placeholder="New subtask…"
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newSubtask.trim()) {
                        void patch({ add_subtask: { title: newSubtask.trim() } }).then(() => {
                          setNewSubtask("")
                          void loadTask(taskId)
                        })
                      }
                    }}
                  />
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      if (!newSubtask.trim()) return
                      void patch({ add_subtask: { title: newSubtask.trim() } }).then(() => {
                        setNewSubtask("")
                        void loadTask(taskId)
                      })
                    }}
                  >
                    + Add subtask
                  </Button>
                </div>
              </div>

              <div>
                <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Comments
                </p>
                <div className="max-h-40 space-y-2 overflow-y-auto">
                  {task.os_task_comments.length === 0 ? (
                    <p className="font-mono text-xs text-muted-foreground">No comments yet</p>
                  ) : (
                    task.os_task_comments.map((c) => (
                      <div key={c.id} className="rounded-md border border-border/60 bg-background/60 px-3 py-2">
                        <p className="font-mono text-[10px] text-muted-foreground">
                          @{c.author_username ?? "staff"} · {formatDateTime(c.created_at)}
                        </p>
                        <p className="mt-1 font-mono text-xs text-foreground">{c.body}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write a comment…"
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && comment.trim()) {
                        void patch({ add_comment: { body: comment.trim() } }).then(() => {
                          setComment("")
                          void loadTask(taskId)
                        })
                      }
                    }}
                  />
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      if (!comment.trim()) return
                      void patch({ add_comment: { body: comment.trim() } }).then(() => {
                        setComment("")
                        void loadTask(taskId)
                      })
                    }}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
          <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={() => void handleMarkDone()} disabled={saving}>
            Mark done
          </Button>
          <Button size="sm" variant="destructive" onClick={() => void handleDelete()} disabled={saving}>
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div>
      <label className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2 py-2 font-mono text-xs capitalize"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  )
}
