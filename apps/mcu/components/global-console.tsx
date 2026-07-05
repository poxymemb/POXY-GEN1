"use client"

import { useState } from "react"
import {
  X,
  Plus,
  Search,
  Filter,
  Bell,
  ShieldOff,
  PowerOff,
  Activity,
  ChevronRight,
  CircleDot,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { staff as allStaff, activityStream, type Staff } from "@/lib/data"
import { StatusBadge, ClearanceBadge, WorkloadBar } from "@/components/badges"

type Tab = { id: string; label: string; closable: boolean }

const initialTabs: Tab[] = [
  { id: "ops", label: "Live Operations", closable: false },
  { id: "U-0142", label: "Kenji Sato", closable: true },
  { id: "U-0091", label: "Aria Vance", closable: true },
]

export function GlobalConsole() {
  const [tabs, setTabs] = useState<Tab[]>(initialTabs)
  const [activeTab, setActiveTab] = useState("ops")
  const [selected, setSelected] = useState<Staff>(allStaff[1])
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  const filtered = allStaff.filter((s) => {
    const matchesQuery =
      !query ||
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.activeTask.toLowerCase().includes(query.toLowerCase()) ||
      s.tenantCode.toLowerCase().includes(query.toLowerCase())
    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter
    return matchesQuery && matchesStatus
  })

  function openTab(s: Staff) {
    setSelected(s)
    if (!tabs.find((t) => t.id === s.id)) {
      setTabs((prev) => [...prev, { id: s.id, label: s.name, closable: true }])
    }
    setActiveTab(s.id)
  }

  function closeTab(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setTabs((prev) => prev.filter((t) => t.id !== id))
    if (activeTab === id) setActiveTab("ops")
  }

  return (
    <div className="flex min-h-0 flex-1">
      {/* CENTER PANE */}
      <section className="flex min-w-0 flex-1 flex-col border-r border-border">
        {/* Multi-tasking tabs */}
        <div className="flex h-9 items-stretch overflow-x-auto border-b border-border bg-card scrollbar-thin">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                const s = allStaff.find((x) => x.id === tab.id)
                if (s) setSelected(s)
              }}
              className={cn(
                "group flex shrink-0 items-center gap-2 border-r border-border px-3 text-xs transition-colors",
                activeTab === tab.id
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
              )}
            >
              <CircleDot
                className={cn(
                  "size-3",
                  activeTab === tab.id ? "text-accent" : "text-muted-foreground/50",
                )}
              />
              <span className="max-w-32 truncate">{tab.label}</span>
              {tab.closable && (
                <span
                  onClick={(e) => closeTab(e, tab.id)}
                  className="flex size-4 items-center justify-center rounded-sm text-muted-foreground opacity-0 hover:bg-secondary hover:text-foreground group-hover:opacity-100"
                >
                  <X className="size-3" />
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => setActiveTab("ops")}
            className="flex w-9 shrink-0 items-center justify-center text-muted-foreground hover:bg-background/50 hover:text-foreground"
            title="New tab"
          >
            <Plus className="size-4" />
          </button>
        </div>

        {/* Header / metrics strip */}
        <div className="flex items-center justify-between gap-4 border-b border-border bg-background px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              Cross-Project Staff Operations
            </h1>
            <p className="font-mono text-[11px] text-muted-foreground">
              Unified workload across 4 active tenants
            </p>
          </div>
          <div className="hidden items-center gap-4 lg:flex">
            <Metric label="Active" value="6" accent="text-foreground" />
            <Metric label="On Task" value="3" accent="text-foreground" />
            <Metric label="Avg Load" value="61%" accent="text-foreground" />
            <Metric label="Sessions" value="27" accent="text-foreground" />
          </div>
        </div>

        {/* Quick filters */}
        <div className="flex items-center gap-2 border-b border-border bg-background px-4 py-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter tasks, staff, tenant…"
              className="h-7 w-full rounded-sm border border-border bg-card pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1">
            {["ALL", "ACTIVE", "ON_TASK", "IDLE", "OFFLINE"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors",
                  statusFilter === s
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
          <button className="ml-auto flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
            <Filter className="size-3.5" />
            <span className="hidden sm:inline">Advanced</span>
          </button>
        </div>

        {/* Data table */}
        <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                <Th>Operator</Th>
                <Th>Tenant</Th>
                <Th>Status</Th>
                <Th>Active Task</Th>
                <Th>Workload</Th>
                <Th className="text-right">Sessions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setSelected(s)}
                  onDoubleClick={() => openTab(s)}
                  className={cn(
                    "cursor-pointer border-b border-border/60 text-xs transition-colors",
                    selected.id === s.id
                      ? "bg-accent/10"
                      : "hover:bg-secondary/50",
                  )}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 items-center justify-center rounded-full border border-border bg-secondary text-[10px] font-bold text-foreground">
                        {s.name.split(" ").map((n) => n[0]).join("")}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{s.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{s.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-[11px] text-muted-foreground">{s.tenantCode}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="line-clamp-1 text-foreground/80">{s.activeTask}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <WorkloadBar value={s.workload} />
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                    {s.sessions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="p-8 text-center font-mono text-xs text-muted-foreground">
              No operators match the current filters.
            </p>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border bg-card px-4 py-1.5 font-mono text-[10px] text-muted-foreground">
          <span>
            {filtered.length} / {allStaff.length} operators
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 animate-pulse rounded-full bg-success" />
            LIVE • polling 2s
          </span>
        </div>
      </section>

      {/* RIGHT PANE — Contextual inspector */}
      <Inspector staff={selected} onOpenTab={() => openTab(selected)} />
    </div>
  )
}

function Metric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="text-right">
      <p className={cn("font-mono text-base font-semibold tabular-nums leading-none", accent)}>{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-4 py-2 font-medium", className)}>{children}</th>
}

function Inspector({ staff: s, onOpenTab }: { staff: Staff; onOpenTab: () => void }) {
  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-y-auto bg-card scrollbar-thin">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Inspector
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">{s.id}</span>
      </div>

      {/* Profile */}
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-md border border-border bg-secondary text-sm font-bold text-foreground">
            {s.name.split(" ").map((n) => n[0]).join("")}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{s.name}</p>
            <p className="font-mono text-[11px] text-muted-foreground">{s.handle}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={s.status} />
          <ClearanceBadge value={s.clearance} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
          <Field label="Role" value={s.role} />
          <Field label="Department" value={s.department} />
          <Field label="Local Time" value={`${s.localTime} ${s.timezone}`} />
          <Field label="Location" value={s.remote ? "Remote" : "On-site"} />
        </dl>
      </div>

      {/* Allocation */}
      <div className="border-b border-border p-4">
        <SectionLabel>Sub-Project Allocation</SectionLabel>
        <div className="mt-2 flex items-center justify-between rounded-sm border border-border bg-background px-3 py-2">
          <span className="text-xs text-foreground">{s.tenant}</span>
          <span className="font-mono text-[10px] text-accent">{s.tenantCode}</span>
        </div>
      </div>

      {/* Active task */}
      <div className="border-b border-border p-4">
        <SectionLabel>Active Task</SectionLabel>
        <p className="mt-2 text-xs text-foreground">{s.activeTask}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-all"
              style={{ width: `${s.taskProgress}%` }}
            />
          </div>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {s.taskProgress}%
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="API Calls" value={s.apiCalls.toLocaleString()} />
          <Stat label="Sessions" value={String(s.sessions)} />
        </div>
      </div>

      {/* Mini activity stream */}
      <div className="border-b border-border p-4">
        <SectionLabel>Live Activity</SectionLabel>
        <ul className="mt-2 space-y-2">
          {activityStream.map((a) => (
            <li key={a.id} className="flex items-start gap-2 text-[11px]">
              <Activity className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-foreground/80">
                <span className="font-mono text-accent">{a.actor}</span> {a.action}{" "}
                <span className="text-muted-foreground">{a.target}</span>
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">{a.time}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Quick actions */}
      <div className="mt-auto space-y-2 p-4">
        <SectionLabel>Quick Actions</SectionLabel>
        <button
          onClick={onOpenTab}
          className="flex w-full items-center justify-between rounded-sm border border-border bg-background px-3 py-2 text-xs text-foreground transition-colors hover:bg-secondary"
        >
          <span className="flex items-center gap-2">
            <ChevronRight className="size-3.5 text-muted-foreground" /> Open full session tab
          </span>
        </button>
        <button className="flex w-full items-center gap-2 rounded-sm border border-border bg-background px-3 py-2 text-xs text-foreground transition-colors hover:bg-secondary">
          <Bell className="size-3.5 text-muted-foreground" /> Trigger notification
        </button>
        <button className="flex w-full items-center gap-2 rounded-sm border border-border bg-background px-3 py-2 text-xs text-foreground transition-colors hover:bg-secondary">
          <ShieldOff className="size-3.5 text-muted-foreground" /> Override status
        </button>
        <button className="flex w-full items-center gap-2 rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive transition-colors hover:bg-destructive/10">
          <PowerOff className="size-3.5" /> Terminate session
        </button>
      </div>
    </aside>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{children}</p>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{value}</dd>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-background px-2.5 py-2">
      <p className="font-mono text-sm font-semibold tabular-nums text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  )
}
