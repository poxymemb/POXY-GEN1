"use client"

import { Fragment, useState } from "react"
import { Plus, Globe, Clock, History, Check, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { roles, permissionNodes, defaultGrants, auditTrail, type Role } from "@/lib/data"

export function AccessControl() {
  const [grants, setGrants] = useState<Record<Role, Set<string>>>(() => {
    const init = {} as Record<Role, Set<string>>
    roles.forEach((r) => (init[r] = new Set(defaultGrants[r])))
    return init
  })

  function toggle(role: Role, node: string) {
    setGrants((prev) => {
      const next = { ...prev }
      const set = new Set(next[role])
      set.has(node) ? set.delete(node) : set.add(node)
      next[role] = set
      return next
    })
  }

  const groups = Array.from(new Set(permissionNodes.map((p) => p.group)))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border bg-background px-4 py-3">
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-foreground">
            Access Infrastructure & RBAC
          </h1>
          <p className="font-mono text-[11px] text-muted-foreground">
            Role → permission node matrix across NULLSPACE LAB assets
          </p>
        </div>
        <button className="ml-auto flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary">
          <Plus className="size-3.5" /> New Role
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
        <div className="grid gap-4 p-4 xl:grid-cols-[2fr_1fr]">
          {/* Matrix editor */}
          <div className="overflow-hidden rounded-md border border-border">
            <div className="border-b border-border bg-card px-3 py-2">
              <h2 className="text-xs font-semibold text-foreground">Permission Matrix</h2>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-card text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="sticky left-0 z-10 bg-card px-3 py-2.5 font-medium">
                      Permission Node
                    </th>
                    {roles.map((r) => (
                      <th key={r} className="px-3 py-2.5 text-center font-medium">
                        {r}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <Fragment key={group}>
                      <tr className="bg-secondary/40">
                        <td
                          colSpan={roles.length + 1}
                          className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                        >
                          {group}
                        </td>
                      </tr>
                      {permissionNodes
                        .filter((p) => p.group === group)
                        .map((node) => (
                          <tr
                            key={node.id}
                            className="border-b border-border/60 text-xs hover:bg-secondary/30"
                          >
                            <td className="sticky left-0 z-10 bg-background px-3 py-2 text-foreground">
                              {node.label}
                              <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                                {node.id}
                              </span>
                            </td>
                            {roles.map((r) => {
                              const on = grants[r].has(node.id)
                              return (
                                <td key={r} className="px-3 py-2 text-center">
                                  <Toggle on={on} onClick={() => toggle(r, node.id)} />
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side column: rule builder + audit */}
          <div className="space-y-4">
            <div className="rounded-md border border-border">
              <div className="border-b border-border bg-card px-3 py-2">
                <h2 className="text-xs font-semibold text-foreground">Conditional Access Rules</h2>
              </div>
              <div className="space-y-3 p-3">
                <RuleRow icon={Globe} label="IP Whitelisting" value="10.0.0.0/8, 192.168.1.0/24" enabled />
                <RuleRow icon={Clock} label="Time-Based Access" value="Mon–Fri • 06:00–22:00 UTC" enabled />
                <RuleRow icon={Globe} label="Geo-Fencing" value="EU, NA regions only" enabled={false} />
                <button className="flex w-full items-center justify-center gap-1.5 rounded-sm border border-dashed border-border py-2 text-[11px] text-muted-foreground hover:border-muted-foreground hover:text-foreground">
                  <Plus className="size-3.5" /> Add access parameter
                </button>
              </div>
            </div>

            <div className="rounded-md border border-border">
              <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
                <History className="size-3.5 text-muted-foreground" />
                <h2 className="text-xs font-semibold text-foreground">Assignment Audit</h2>
              </div>
              <ul className="divide-y divide-border/60">
                {auditTrail.map((a) => (
                  <li key={a.id} className="px-3 py-2 text-[11px]">
                    <p className="text-foreground/90">
                      <span className="font-mono text-accent">{a.actor}</span> {a.action}{" "}
                      <span className="rounded-[3px] border border-border px-1 py-0.5 font-mono text-[10px] text-foreground">
                        {a.role}
                      </span>{" "}
                      to <span className="font-mono text-foreground">{a.to}</span>
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{a.time}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={cn(
        "inline-flex h-5 w-9 items-center rounded-full border px-0.5 transition-colors",
        on ? "border-accent/50 bg-accent/30" : "border-border bg-muted",
      )}
    >
      <span
        className={cn(
          "flex size-3.5 items-center justify-center rounded-full transition-transform",
          on ? "translate-x-3.5 bg-accent text-accent-foreground" : "translate-x-0 bg-muted-foreground/60",
        )}
      >
        {on ? <Check className="size-2.5" strokeWidth={3} /> : <Minus className="size-2.5" strokeWidth={3} />}
      </span>
    </button>
  )
}

function RuleRow({
  icon: Icon,
  label,
  value,
  enabled,
}: {
  icon: typeof Globe
  label: string
  value: string
  enabled: boolean
}) {
  const [on, setOn] = useState(enabled)
  return (
    <div className="flex items-center gap-3 rounded-sm border border-border bg-background px-3 py-2">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-foreground">{label}</p>
        <p className="truncate font-mono text-[10px] text-muted-foreground">{value}</p>
      </div>
      <Toggle on={on} onClick={() => setOn((v) => !v)} />
    </div>
  )
}
