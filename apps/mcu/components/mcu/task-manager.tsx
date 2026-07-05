"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import type { OsTask, StaffMember } from "@/lib/queries"
import { TaskDetailModal } from "@/components/mcu/task-detail-modal"
import { formatDate } from "@/lib/mcu-utils"

const COLUMNS = [
  { id: "todo", label: "TODO" },
  { id: "in_progress", label: "IN PROGRESS" },
  { id: "review", label: "REVIEW" },
  { id: "done", label: "DONE" },
] as const

const PRIORITY_META: Record<string, { label: string; className: string }> = {
  urgent: { label: "🔴 URGENT", className: "text-red-400" },
  high: { label: "🟠 HIGH", className: "text-orange-400" },
  normal: { label: "🟡 NORMAL", className: "text-yellow-400" },
  low: { label: "🟢 LOW", className: "text-green-400" },
}

export function TaskManagerModule() {
  const [tasks, setTasks] = useState<OsTask[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const [filterDept, setFilterDept] = useState("all")
  const [filterPri, setFilterPri] = useState("all")
  const [filterAssignee, setFilterAssignee] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")

  const [newTitle, setNewTitle] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newPri, setNewPri] = useState("normal")
  const [newDept, setNewDept] = useState("support")
  const [newAssign, setNewAssign] = useState("")
  const [newDue, setNewDue] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filterDept !== "all") params.set("department", filterDept)
      if (filterPri !== "all") params.set("priority", filterPri)
      if (filterAssignee !== "all") params.set("assignee", filterAssignee)
      if (filterStatus !== "all") params.set("status", filterStatus)

      const res = await fetch(`/api/mcu/tasks?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load tasks")
      setTasks(data.tasks ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks")
    } finally {
      setLoading(false)
    }
  }, [filterDept, filterPri, filterAssignee, filterStatus])

  useEffect(() => {
    void load()
    fetch("/api/nullspace/team")
      .then((r) => r.json())
      .then((d) => setStaff(d.staff ?? []))
      .catch(() => {})
  }, [load])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("mcu-os-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "os_tasks" }, () => {
        void load()
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [load])

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false
      return true
    })
  }, [tasks, filterStatus])

  async function handleCreate() {
    if (!newTitle.trim()) return
    try {
      const res = await fetch("/api/mcu/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim() || null,
          priority: newPri,
          department: newDept,
          assigned_to: newAssign || null,
          due_date: newDue || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Create failed")
      setShowCreate(false)
      setNewTitle("")
      setNewDesc("")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed")
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <div>
          <h1 className="font-mono text-sm font-semibold uppercase tracking-widest text-foreground">Task Manager</h1>
          <p className="font-mono text-[10px] text-muted-foreground">NULLSPACE LAB // Kanban Ops</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
          <Plus className="size-3.5" /> New Task
        </Button>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3">
        <FilterSelect label="Dept" value={filterDept} onChange={setFilterDept} options={["all", "support", "tech", "marketing"]} />
        <FilterSelect label="Assignee" value={filterAssignee} onChange={setFilterAssignee} options={["all", ...staff.filter((s) => s.profiles?.id).map((s) => s.profiles!.id)]} labels={["All", ...staff.filter((s) => s.profiles?.id).map((s) => `@${s.profiles!.username ?? s.email.split("@")[0]}`)]} />
        <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus} options={["all", "todo", "in_progress", "review", "done"]} />
        <FilterSelect label="Priority" value={filterPri} onChange={setFilterPri} options={["all", "urgent", "high", "normal", "low"]} />
      </div>

      {showCreate && (
        <div className="border-b border-border bg-background/40 px-5 py-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title *" className="rounded-md border border-border bg-background px-3 py-2 font-mono text-xs sm:col-span-2" />
            <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description" rows={2} className="resize-none rounded-md border border-border bg-background px-3 py-2 font-mono text-xs sm:col-span-2" />
            <select value={newPri} onChange={(e) => setNewPri(e.target.value)} className="rounded-md border border-border bg-background px-2 py-2 font-mono text-xs">
              {Object.keys(PRIORITY_META).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select value={newDept} onChange={(e) => setNewDept(e.target.value)} className="rounded-md border border-border bg-background px-2 py-2 font-mono text-xs">
              {["support", "tech", "marketing", "all"].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select value={newAssign} onChange={(e) => setNewAssign(e.target.value)} className="rounded-md border border-border bg-background px-2 py-2 font-mono text-xs">
              <option value="">Unassigned</option>
              {staff.filter((s) => s.profiles?.id).map((s) => (
                <option key={s.profiles!.id} value={s.profiles!.id}>@{s.profiles!.username ?? s.email.split("@")[0]}</option>
              ))}
            </select>
            <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} className="rounded-md border border-border bg-background px-2 py-2 font-mono text-xs" />
          </div>
          <Button size="sm" className="mt-3" onClick={() => void handleCreate()}>Create task</Button>
        </div>
      )}

      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-2 font-mono text-xs text-destructive">{error}</div>
      )}

      <div className="min-h-0 flex-1 overflow-x-auto p-4">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="flex min-h-full gap-3">
            {COLUMNS.map((col) => {
              const items = filtered.filter((t) => t.status === col.id)
              return (
                <div key={col.id} className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-background/30">
                  <div className="border-b border-border px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {col.label} <span className="text-foreground">({items.length})</span>
                  </div>
                  <div className="min-h-[200px] flex-1 space-y-2 p-2">
                    {items.map((task) => (
                      <TaskCard key={task.id} task={task} onClick={() => setSelectedId(task.id)} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <TaskDetailModal taskId={selectedId} onClose={() => setSelectedId(null)} onUpdated={() => void load()} staff={staff} />
    </div>
  )
}

function TaskCard({ task, onClick }: { task: OsTask; onClick: () => void }) {
  const pri = PRIORITY_META[task.priority] ?? PRIORITY_META.normal
  return (
    <button type="button" onClick={onClick} className="w-full rounded-md border border-border bg-background/60 p-3 text-left transition-colors hover:border-foreground/20">
      <p className={cn("font-mono text-[9px] font-semibold", pri.className)}>{pri.label}</p>
      <p className="mt-1 font-mono text-[9px] uppercase text-muted-foreground">{task.department ?? "—"}</p>
      <p className="mt-1 font-mono text-xs font-medium text-foreground">{task.title}</p>
      <p className="mt-2 font-mono text-[10px] text-muted-foreground">
        Due: {task.due_date ? formatDate(task.due_date) : "—"} · @{task.assignee_username ?? "unassigned"}
      </p>
      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
        ☑ {task.subtask_done}/{task.subtask_total} · 💬 {task.comment_count}
      </p>
    </button>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  labels?: string[]
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="font-mono text-[9px] uppercase text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 font-mono text-[10px] capitalize">
        {options.map((o, i) => (
          <option key={o} value={o}>{labels?.[i] ?? o.replace(/_/g, " ")}</option>
        ))}
      </select>
    </div>
  )
}
