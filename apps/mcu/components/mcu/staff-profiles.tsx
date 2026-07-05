"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { formatDate, formatRelative } from "@/lib/mcu-utils"

type LeaderboardRow = {
  rank: number
  profile_id: string
  username: string
  avatar_url: string | null
  role: string
  tickets_closed: number
  avg_csat: number
  avg_response_minutes: number
  medal: string
}

type StaffCard = {
  profile_id: string
  email: string
  role: string
  username: string
  avatar_url: string | null
  is_active: boolean
  tickets_closed: number
  avg_csat: number
  avg_response_minutes: number
  complaints: number
  total_messages: number
  last_active: string | null
}

type StaffProfile = {
  username?: string
  avatar_url?: string
  email?: string
  role?: string
  tickets_closed?: number
  avg_csat?: number
  avg_response_minutes?: number
  total_messages?: number
  complaints?: number
  last_active?: string
  member_since?: string
}

type ActivityBar = { label: string; count: number; pct: number }

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url?.startsWith("http")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="h-9 w-9 rounded-full border border-zinc-700 object-cover" />
    )
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 font-mono text-xs text-foreground">
      {(name[0] ?? "?").toUpperCase()}
    </div>
  )
}

function ActivityChart({ bars }: { bars: ActivityBar[] }) {
  return (
    <div className="space-y-2">
      {bars.map((bar) => (
        <div key={bar.label} className="flex items-center gap-2 font-mono text-[10px]">
          <span className="w-8 text-muted-foreground">{bar.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full bg-emerald-500/70" style={{ width: `${bar.pct}%` }} />
          </div>
          <span className="w-4 text-right tabular-nums text-muted-foreground">{bar.count}</span>
        </div>
      ))}
    </div>
  )
}

export function StaffProfilesModule() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([])
  const [staff, setStaff] = useState<StaffCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [activity, setActivity] = useState<ActivityBar[]>([])
  const [modalLoading, setModalLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/mcu/staff")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to load staff")
      setLeaderboard(json.leaderboard ?? [])
      setStaff(json.staff ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load staff")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function openProfile(profileId: string) {
    setSelectedId(profileId)
    setModalLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/mcu/staff?profileId=${profileId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to load profile")
      setProfile(json.profile ?? {})
      setActivity(json.activity ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile")
    } finally {
      setModalLoading(false)
    }
  }

  function roleBadgeClass(role: string) {
    const r = role.toLowerCase()
    const map: Record<string, string> = {
      superadmin: "text-pink-400",
      mod: "text-blue-400",
      support: "text-emerald-400",
      marketing: "text-purple-400",
      dev: "text-amber-400",
    }
    return map[r] ?? "text-muted-foreground"
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="shrink-0 border-b border-zinc-800/80 px-4 py-3">
        <h1 className="font-mono text-sm font-semibold tracking-widest">STAFF PROFILES</h1>
        <p className="font-mono text-[10px] text-muted-foreground">Team leaderboard &amp; profiles</p>
      </header>

      {error && (
        <div className="mx-4 mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-[11px] text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-6 p-4">
        <section className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-4">
          <h2 className="mb-3 font-mono text-[10px] font-semibold tracking-widest text-muted-foreground">
            TEAM LEADERBOARD — THIS MONTH
          </h2>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] font-mono text-[11px]">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-[9px] tracking-widest text-muted-foreground">
                    <th className="pb-2 pr-3">Rank</th>
                    <th className="pb-2 pr-3">Staff</th>
                    <th className="pb-2 pr-3">Role</th>
                    <th className="pb-2 pr-3">Closed</th>
                    <th className="pb-2 pr-3">CSAT</th>
                    <th className="pb-2 pr-3">Avg reply</th>
                    <th className="pb-2">🏆</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-muted-foreground">
                        No leaderboard data
                      </td>
                    </tr>
                  ) : (
                    leaderboard.map((row) => (
                      <tr
                        key={row.profile_id}
                        className="cursor-pointer border-b border-zinc-900/60 hover:bg-zinc-900/40"
                        onClick={() => void openProfile(row.profile_id)}
                      >
                        <td className="py-2 pr-3 tabular-nums">{row.rank}</td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <Avatar url={row.avatar_url} name={row.username} />
                            <span className="text-foreground">@{row.username}</span>
                          </div>
                        </td>
                        <td className={cn("py-2 pr-3 uppercase", roleBadgeClass(row.role))}>
                          {row.role}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">{row.tickets_closed}</td>
                        <td className="py-2 pr-3 tabular-nums">
                          {row.avg_csat ? `${row.avg_csat.toFixed(1)}★` : "—"}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">
                          {row.avg_response_minutes ? `${row.avg_response_minutes}m` : "—"}
                        </td>
                        <td className="py-2">{row.medal}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-mono text-[10px] font-semibold tracking-widest text-muted-foreground">
            ALL STAFF
          </h2>
          {loading ? null : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {staff.map((member) => (
                <button
                  key={member.profile_id}
                  type="button"
                  onClick={() => void openProfile(member.profile_id)}
                  className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-4 text-left transition-colors hover:border-zinc-600"
                >
                  <div className="flex items-center gap-3">
                    <Avatar url={member.avatar_url} name={member.username} />
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[11px] font-semibold text-foreground">
                        @{member.username}
                      </p>
                      <p className={cn("font-mono text-[9px] uppercase", roleBadgeClass(member.role))}>
                        {member.role}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "ml-auto h-2 w-2 rounded-full",
                        member.is_active ? "bg-emerald-400" : "bg-zinc-600",
                      )}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[9px] text-muted-foreground">
                    <span>Closed: {member.tickets_closed}</span>
                    <span>CSAT: {member.avg_csat ? member.avg_csat.toFixed(1) : "—"}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              {modalLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : profile ? (
                <div className="flex items-center gap-3">
                  <Avatar
                    url={profile.avatar_url ?? null}
                    name={profile.username ?? "staff"}
                  />
                  <div>
                    <h3 className="font-mono text-sm font-semibold text-foreground">
                      @{profile.username ?? "staff"}
                    </h3>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {(profile.role ?? "support").toLowerCase()} · member since{" "}
                      {formatDate(profile.member_since)}
                    </p>
                  </div>
                </div>
              ) : null}
              <button type="button" onClick={() => setSelectedId(null)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {!modalLoading && profile && (
              <>
                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["Closed", profile.tickets_closed ?? 0],
                    ["CSAT", profile.avg_csat ? `${Number(profile.avg_csat).toFixed(1)}★` : "—"],
                    ["Avg reply", profile.avg_response_minutes ? `${profile.avg_response_minutes}m` : "—"],
                    ["Complaints", profile.complaints ?? 0],
                  ].map(([label, val]) => (
                    <div
                      key={String(label)}
                      className="rounded-md border border-zinc-800/60 bg-zinc-900/40 px-2 py-2 text-center"
                    >
                      <div className="font-mono text-sm font-semibold tabular-nums text-foreground">
                        {val}
                      </div>
                      <div className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mb-4 space-y-1 font-mono text-[10px] text-muted-foreground">
                  <p>Total messages: {profile.total_messages ?? 0}</p>
                  <p>Last active: {formatRelative(profile.last_active)}</p>
                </div>
                <div className="mb-4">
                  <h4 className="mb-2 font-mono text-[9px] font-semibold tracking-widest text-muted-foreground">
                    ACTIVITY — LAST 7 DAYS
                  </h4>
                  <ActivityChart bars={activity} />
                </div>
              </>
            )}

            <Button
              size="sm"
              variant="outline"
              className="w-full border-zinc-700 bg-transparent font-mono text-[10px]"
              onClick={() => setSelectedId(null)}
            >
              CLOSE
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
