"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import type { OsTask, StaffMember } from "@/lib/queries"
import { TaskDetailModal } from "@/components/mcu/task-detail-modal"
import { formatDate } from "@/lib/mcu-utils"

const PRIORITY_DOT: Record<string, string> = {
  urgent: "text-red-400",
  high: "text-orange-400",
  normal: "text-yellow-400",
  low: "text-emerald-400",
}

function groupTasks(tasks: OsTask[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekEnd = new Date(today)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const todayG: OsTask[] = []
  const weekG: OsTask[] = []
  const laterG: OsTask[] = []

  for (const task of tasks.filter((t) => t.status !== "done")) {
    if (!task.due_date) {
      laterG.push(task)
      continue
    }
    const d = new Date(`${task.due_date}T12:00:00`)
    d.setHours(0, 0, 0, 0)
    if (d <= today) todayG.push(task)
    else if (d < weekEnd) weekG.push(task)
    else laterG.push(task)
  }

  return { todayG, weekG, laterG }
}

export function MyTasksModule() {
  const [tasks, setTasks] = useState<OsTask[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/mcu/tasks?mine=true")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load tasks")
      setTasks(data.tasks ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    fetch("/api/nullspace/team")
      .then((r) => r.json())
      .then((d) => setStaff(d.staff ?? []))
      .catch(() => {})
  }, [load])

  const groups = useMemo(() => groupTasks(tasks), [tasks])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border px-5 py-3">
        <h1 className="font-mono text-sm font-semibold uppercase tracking-widest text-foreground">My Tasks</h1>
        <p className="font-mono text-[10px] text-muted-foreground">NULLSPACE LAB // Assigned to you</p>
      </header>

      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-2 font-mono text-xs text-destructive">{error}</div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 scrollbar-thin">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-6">
            <TaskGroup title="Today" tasks={groups.todayG} onOpen={setSelectedId} />
            <TaskGroup title="This Week" tasks={groups.weekG} onOpen={setSelectedId} />
            <TaskGroup title="Later" tasks={groups.laterG} onOpen={setSelectedId} />
          </div>
        )}
      </div>

      <TaskDetailModal taskId={selectedId} onClose={() => setSelectedId(null)} onUpdated={() => void load()} staff={staff} />
    </div>
  )
}

function TaskGroup({
  title,
  tasks,
  onOpen,
}: {
  title: string
  tasks: OsTask[]
  onOpen: (id: string) => void
}) {
  return (
    <section>
      <h2 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>
      {tasks.length === 0 ? (
        <p className="font-mono text-xs text-muted-foreground">Nothing here</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => onOpen(task.id)}
                className="flex w-full items-center gap-3 rounded-md border border-border bg-background/40 px-3 py-3 text-left transition-colors hover:bg-sidebar-accent/30"
              >
                <span className={`font-mono text-xs ${PRIORITY_DOT[task.priority] ?? PRIORITY_DOT.normal}`}>●</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs font-medium text-foreground">{task.title}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {task.department ?? "—"} · Due: {task.due_date ? formatDate(task.due_date) : "—"} · {task.status.replace(/_/g, " ")}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
