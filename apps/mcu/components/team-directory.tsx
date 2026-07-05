"use client"

import { useEffect, useState } from "react"
import {
  Search,
  Settings2,
  ChevronDown,
  Layers,
  Building2,
  Wifi,
  CheckSquare,
  Megaphone,
  ShieldCheck,
  UserCog,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { staff as mockStaff, tenants, type Clearance, type Staff } from "@/lib/data"
import { type StaffMember } from "@/lib/queries"
import { StatusBadge, ClearanceBadge } from "@/components/badges"

type DirectoryStaff = Staff & { avatar?: string | null }

const filterTree = [
  {
    label: "Sub-Projects",
    icon: Layers,
    items: tenants.filter((t) => t.id !== "all").map((t) => ({ id: t.id, label: t.name, code: t.code })),
  },
  {
    label: "Departments",
    icon: Building2,
    items: [
      { id: "Platform", label: "Platform" },
      { id: "Security", label: "Security" },
      { id: "Delivery", label: "Delivery" },
      { id: "Data", label: "Data" },
      { id: "Reliability", label: "Reliability" },
      { id: "Quality", label: "Quality" },
      { id: "Command", label: "Command" },
      { id: "Integrations", label: "Integrations" },
    ],
  },
  {
    label: "Remote Status",
    icon: Wifi,
    items: [
      { id: "remote", label: "Remote" },
      { id: "onsite", label: "On-site" },
    ],
  },
]

function mapRoleToClearance(role: string): Clearance {
  switch (role) {
    case "superadmin":
      return "L5 // ROOT"
    case "mod":
      return "L4 // ADMIN"
    case "support":
      return "L3 // LEAD"
    case "marketing":
    case "dev":
    case "dev_topup":
      return "L2 // DEV"
    default:
      return "L2 // DEV"
  }
}

function mapRoleLabel(role: string): string {
  switch (role) {
    case "superadmin":
      return "Super Admin"
    case "mod":
      return "Moderator"
    case "support":
      return "Support"
    case "marketing":
      return "Marketing"
    case "dev":
    case "dev_topup":
      return "Developer"
    default:
      return role
  }
}

function mapStaffMember(member: StaffMember): DirectoryStaff {
  const profile = member.profiles
  const emailHandle = member.email.includes("@") ? member.email.split("@")[0] : member.email

  return {
    id: profile.id,
    name: profile.username ?? emailHandle,
    handle: `@${emailHandle}`,
    role: mapRoleLabel(member.role),
    tenant: "NULLSPACE LAB",
    tenantCode: "NS",
    department: "Command",
    status: "ACTIVE",
    clearance: mapRoleToClearance(member.role),
    localTime: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    timezone: "UTC",
    remote: true,
    workload: 0,
    activeTask: "—",
    taskProgress: 0,
    sessions: 0,
    apiCalls: 0,
    lastSeen: "now",
    avatar: profile.avatar_url,
  }
}

async function fetchTeam(): Promise<StaffMember[] | null> {
  const res = await fetch("/api/nullspace/team")
  if (!res.ok) return null
  const data = (await res.json()) as { staff?: StaffMember[] }
  return data.staff ?? null
}

export function TeamDirectory() {
  const [isLoading, setIsLoading] = useState(true)
  const [staffList, setStaffList] = useState<DirectoryStaff[]>(mockStaff)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      try {
        const staff = await fetchTeam()
        if (cancelled) return

        if (!staff || staff.length === 0) {
          setStaffList(mockStaff)
          return
        }

        setStaffList(staff.map(mapStaffMember))
      } catch {
        if (!cancelled) {
          setStaffList(mockStaff)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleFilter(id: string) {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = staffList.filter((s) => {
    const q =
      !query ||
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.handle.toLowerCase().includes(query.toLowerCase()) ||
      s.role.toLowerCase().includes(query.toLowerCase())
    if (!q) return false
    if (activeFilters.size === 0) return true
    const tenantMatch = tenants.some(
      (t) => activeFilters.has(t.id) && s.tenant === t.name,
    )
    const deptMatch = activeFilters.has(s.department)
    const remoteMatch =
      (activeFilters.has("remote") && s.remote) || (activeFilters.has("onsite") && !s.remote)
    return tenantMatch || deptMatch || remoteMatch
  })

  const allChecked = filtered.length > 0 && filtered.every((s) => selected.has(s.id))

  return (
    <div className="flex min-h-0 flex-1">
      {/* Filter tree */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Ecosystem Filters</h2>
          <p className="font-mono text-[11px] text-muted-foreground">Refine the organization matrix</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          {filterTree.map((group) => (
            <FilterGroup
              key={group.label}
              group={group}
              activeFilters={activeFilters}
              onToggle={toggleFilter}
            />
          ))}
        </div>
        {activeFilters.size > 0 && (
          <button
            onClick={() => setActiveFilters(new Set())}
            className="border-t border-border px-4 py-2 text-left font-mono text-[11px] text-accent hover:bg-secondary"
          >
            Clear {activeFilters.size} filter(s)
          </button>
        )}
      </aside>

      {/* Main matrix */}
      <section className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border bg-background px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground">Team Directory</h1>
            <p className="font-mono text-[11px] text-muted-foreground">
              {isLoading ? "— personnel" : `${filtered.length} personnel`} across {tenants.length - 1} sub-brands
            </p>
          </div>
          <div className="relative ml-auto w-72 max-w-full">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Fuzzy search personnel…"
              disabled={isLoading}
              className="h-8 w-full rounded-sm border border-border bg-card pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none disabled:opacity-50"
            />
          </div>
          <button
            disabled={isLoading}
            className="flex h-8 items-center gap-1.5 rounded-sm border border-border px-2.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <Settings2 className="size-3.5" />
            <span className="hidden sm:inline">Columns</span>
          </button>
        </div>

        {/* Bulk actions bar */}
        <div
          className={cn(
            "flex items-center gap-2 border-b border-border px-4 py-2 transition-colors",
            selected.size > 0 ? "bg-accent/10" : "bg-background",
          )}
        >
          {selected.size > 0 ? (
            <>
              <span className="font-mono text-xs text-accent">{selected.size} selected</span>
              <div className="ml-2 flex items-center gap-1.5">
                <BulkBtn icon={Layers}>Assign Project</BulkBtn>
                <BulkBtn icon={ShieldCheck}>Shift Permissions</BulkBtn>
                <BulkBtn icon={Megaphone}>Batch Announce</BulkBtn>
                <BulkBtn icon={UserCog}>Reassign Lead</BulkBtn>
              </div>
              <button
                onClick={() => setSelected(new Set())}
                className="ml-auto font-mono text-[11px] text-muted-foreground hover:text-foreground"
              >
                Deselect all
              </button>
            </>
          ) : (
            <span className="font-mono text-[11px] text-muted-foreground">
              Select rows to enable bulk actions
            </span>
          )}
        </div>

        {/* Matrix grid */}
        <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="w-10 px-4 py-2.5">
                  <Checkbox
                    checked={allChecked}
                    onChange={() =>
                      setSelected(allChecked ? new Set() : new Set(filtered.map((s) => s.id)))
                    }
                  />
                </th>
                <th className="px-4 py-2.5 font-medium">Employee</th>
                <th className="px-4 py-2.5 font-medium">Project Allocation</th>
                <th className="px-4 py-2.5 font-medium">Availability</th>
                <th className="px-4 py-2.5 font-medium">Local Time</th>
                <th className="px-4 py-2.5 font-medium">Clearance</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/60">
                      <td className="px-4 py-2.5">
                        <div className="size-4 animate-pulse rounded-[3px] bg-muted" />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="size-7 animate-pulse rounded-full bg-muted" />
                          <div className="space-y-1.5">
                            <div className="h-3 w-28 animate-pulse rounded-sm bg-muted" />
                            <div className="h-2.5 w-36 animate-pulse rounded-sm bg-muted/70" />
                          </div>
                        </div>
                      </td>
                      {Array.from({ length: 4 }).map((__, j) => (
                        <td key={j} className="px-4 py-2.5">
                          <div className="h-3 animate-pulse rounded-sm bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                : filtered.map((s) => (
                    <tr
                      key={s.id}
                      className={cn(
                        "border-b border-border/60 text-xs transition-colors",
                        selected.has(s.id) ? "bg-accent/10" : "hover:bg-secondary/50",
                      )}
                    >
                      <td className="px-4 py-2.5">
                        <Checkbox checked={selected.has(s.id)} onChange={() => toggleRow(s.id)} />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {s.avatar ? (
                            <img
                              src={s.avatar}
                              alt=""
                              className="size-7 rounded-full border border-border object-cover"
                            />
                          ) : (
                            <span className="flex size-7 items-center justify-center rounded-full border border-border bg-secondary text-[10px] font-bold text-foreground">
                              {s.name.split(" ").map((n) => n[0]).join("")}
                            </span>
                          )}
                          <div>
                            <p className="font-medium text-foreground">{s.name}</p>
                            <p className="font-mono text-[10px] text-muted-foreground">
                              {s.handle} • {s.role}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-accent">{s.tenantCode}</span>
                          <span className="text-foreground/80">{s.tenant}</span>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {s.department}{s.remote ? " • Remote" : " • On-site"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-4 py-2.5 font-mono tabular-nums text-foreground/80">
                        {s.localTime}{" "}
                        <span className="text-muted-foreground">{s.timezone}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <ClearanceBadge value={s.clearance} />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function FilterGroup({
  group,
  activeFilters,
  onToggle,
}: {
  group: { label: string; icon: typeof Layers; items: { id: string; label: string; code?: string }[] }
  activeFilters: Set<string>
  onToggle: (id: string) => void
}) {
  const [open, setOpen] = useState(true)
  const Icon = group.icon
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
      >
        <Icon className="size-3.5 text-muted-foreground" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", !open && "-rotate-90")} />
      </button>
      {open && (
        <ul className="ml-2 mt-0.5 space-y-0.5 border-l border-border pl-2">
          {group.items.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onToggle(item.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-[11px] transition-colors",
                  activeFilters.has(item.id)
                    ? "bg-accent/10 text-accent"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-[2px] border",
                    activeFilters.has(item.id) ? "border-accent bg-accent" : "border-border",
                  )}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {item.code && <span className="font-mono text-[9px] opacity-70">{item.code}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BulkBtn({ icon: Icon, children }: { icon: typeof Layers; children: React.ReactNode }) {
  return (
    <button className="flex items-center gap-1.5 rounded-sm border border-border bg-background px-2 py-1 text-[11px] text-foreground transition-colors hover:bg-secondary">
      <Icon className="size-3.5 text-muted-foreground" />
      {children}
    </button>
  )
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="checkbox"
      aria-checked={checked}
      className={cn(
        "flex size-4 items-center justify-center rounded-[3px] border transition-colors",
        checked ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-muted-foreground",
      )}
    >
      {checked && <CheckSquare className="size-3" strokeWidth={3} />}
    </button>
  )
}
