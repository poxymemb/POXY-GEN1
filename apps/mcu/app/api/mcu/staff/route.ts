import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { requireStaffSession } from "@/lib/mcu-auth"

function monthStartIso() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function weekAgoIso() {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function buildActivityBars(rows: Array<{ closed_at: string | null }>) {
  const days: Array<{ key: string; label: string; count: number }> = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    days.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      count: 0,
    })
  }

  for (const row of rows) {
    if (!row.closed_at) continue
    const key = new Date(row.closed_at).toISOString().slice(0, 10)
    const bucket = days.find((d) => d.key === key)
    if (bucket) bucket.count++
  }

  const max = Math.max(1, ...days.map((d) => d.count))
  return days.map((d) => ({
    label: d.label,
    count: d.count,
    pct: Math.round((d.count / max) * 100),
  }))
}

export async function GET(request: Request) {
  try {
    const { supabase } = await requireStaffSession()
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get("profileId")

    if (profileId) {
      const [{ data: profile, error: profileErr }, { data: activityRows, error: actErr }] =
        await Promise.all([
          supabase.rpc("get_staff_profile", { p_staff_id: profileId }),
          supabaseAdmin
            .from("support_tickets")
            .select("closed_at")
            .eq("assigned_to", profileId)
            .eq("status", "closed")
            .gte("closed_at", weekAgoIso()),
        ])

      if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })
      if (actErr) return NextResponse.json({ error: actErr.message }, { status: 500 })

      return NextResponse.json({
        profile: profile ?? {},
        activity: buildActivityBars(activityRows ?? []),
      })
    }

    const { data: teamRaw, error: teamErr } = await supabase.rpc("get_team_members")
    if (teamErr) return NextResponse.json({ error: teamErr.message }, { status: 500 })

    const members = (teamRaw ?? []).filter(
      (m: { profile_id: string | null }) => m.profile_id,
    ) as Array<{
      email: string
      role: string
      profile_id: string
      is_active: boolean
      last_login: string | null
    }>

    if (!members.length) {
      return NextResponse.json({ staff: [], leaderboard: [] })
    }

    const ids = members.map((m) => m.profile_id)
    const monthStart = monthStartIso()

    const [{ data: stats }, { data: profiles }, { data: closedMonth }] = await Promise.all([
      supabaseAdmin
        .from("staff_stats")
        .select("staff_id, avg_csat, avg_response_minutes, tickets_closed, complaints, total_messages_sent, last_active")
        .in("staff_id", ids),
      supabaseAdmin.from("profiles").select("id, username, avatar_url, created_at").in("id", ids),
      supabaseAdmin
        .from("support_tickets")
        .select("assigned_to")
        .eq("status", "closed")
        .gte("closed_at", monthStart)
        .in("assigned_to", ids),
    ])

    const statMap: Record<
      string,
      {
        staff_id: string
        avg_csat: number
        avg_response_minutes: number
        tickets_closed: number
        complaints: number
        total_messages_sent: number
        last_active: string | null
      }
    > = {}
    for (const s of stats ?? []) statMap[s.staff_id] = s

    const profMap: Record<string, (typeof profiles)[number]> = {}
    for (const p of profiles ?? []) profMap[p.id] = p

    const closedMap: Record<string, number> = {}
    for (const t of closedMonth ?? []) {
      if (t.assigned_to) closedMap[t.assigned_to] = (closedMap[t.assigned_to] ?? 0) + 1
    }

    const staff = members.map((m) => {
      const prof = profMap[m.profile_id]
      const stat = statMap[m.profile_id]
      return {
        profile_id: m.profile_id,
        email: m.email,
        role: m.role === "admin" ? "superadmin" : m.role,
        username: prof?.username ?? m.email.split("@")[0],
        avatar_url: prof?.avatar_url ?? null,
        is_active: m.is_active,
        last_login: m.last_login,
        tickets_closed: stat?.tickets_closed ?? 0,
        avg_csat: Number(stat?.avg_csat ?? 0),
        avg_response_minutes: stat?.avg_response_minutes ?? 0,
        complaints: stat?.complaints ?? 0,
        total_messages: stat?.total_messages_sent ?? 0,
        last_active: stat?.last_active ?? null,
      }
    })

    const medals = ["🥇", "🥈", "🥉"]
    const leaderboard = staff
      .map((s) => ({
        profile_id: s.profile_id,
        username: s.username,
        avatar_url: s.avatar_url,
        role: s.role,
        tickets_closed: closedMap[s.profile_id] ?? 0,
        avg_csat: s.avg_csat,
        avg_response_minutes: s.avg_response_minutes,
      }))
      .sort(
        (a, b) =>
          b.tickets_closed - a.tickets_closed ||
          b.avg_csat - a.avg_csat,
      )
      .map((row, i) => ({ ...row, rank: i + 1, medal: medals[i] ?? "" }))

    return NextResponse.json({ staff, leaderboard })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load staff"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
