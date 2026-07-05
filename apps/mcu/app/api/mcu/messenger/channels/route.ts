import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { computeChannelUnread, type OsChannelRow, type TeamMemberRow } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"
import {
  channelDisplayName,
  DEPT_ACCESS,
  dmChannelName,
  normalizeStaffRole,
} from "@/lib/mcu-messenger"

async function ensureChannelMemberships(userId: string, role: string) {
  const normalized = normalizeStaffRole(role)
  const allowed = DEPT_ACCESS[normalized] ?? ["shared"]

  const { data: channels, error } = await supabaseAdmin
    .from("os_channels")
    .select("id, type, department")

  if (error) throw error

  const rows: { channel_id: string; staff_id: string }[] = []
  for (const ch of channels ?? []) {
    if (ch.type === "direct") continue
    if (!ch.department || allowed.includes(ch.department)) {
      rows.push({ channel_id: ch.id, staff_id: userId })
    }
  }

  if (rows.length) {
    await supabaseAdmin
      .from("os_channel_members")
      .upsert(rows, { onConflict: "channel_id,staff_id", ignoreDuplicates: true })
  }
}

export async function GET() {
  try {
    const { user, supabase, role } = await requireStaffSession()

    await ensureChannelMemberships(user.id, role)

    const [{ data: memberRows }, { data: teamRaw }, { data: presence }] = await Promise.all([
      supabaseAdmin.from("os_channel_members").select("channel_id").eq("staff_id", user.id),
      supabase.rpc("get_team_members"),
      supabaseAdmin.from("user_presence").select("user_id, is_online"),
    ])

    const channelIds = (memberRows ?? []).map((r) => r.channel_id)
    if (!channelIds.length) {
      return NextResponse.json({
        channels: [],
        groupChannels: [],
        directChannels: [],
        currentUserId: user.id,
        currentUserOnline: true,
        profileMap: {},
        staffTeam: [],
      })
    }

    const [{ data: channels, error: chErr }, unreadMap] = await Promise.all([
      supabaseAdmin
        .from("os_channels")
        .select("*")
        .in("id", channelIds)
        .order("type")
        .order("name"),
      computeChannelUnread(user.id, channelIds),
    ])

    if (chErr) return NextResponse.json({ error: chErr.message }, { status: 500 })

    const profileMap: Record<string, string | null> = {}
    const dmUserIds = new Set<string>()

    for (const ch of channels ?? []) {
      if (ch.type === "direct") {
        ch.name
          .replace(/^dm_/, "")
          .split("_")
          .forEach((p: string) => {
            if (p && p !== user.id) dmUserIds.add(p)
          })
      }
    }

    const teamMembers = (teamRaw ?? []) as TeamMemberRow[]
    const teamProfileIds = teamMembers.map((m) => m.profile_id).filter(Boolean) as string[]
    const allProfileIds = [...new Set([...teamProfileIds, ...dmUserIds])]

    if (allProfileIds.length) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", allProfileIds)

      for (const p of profiles ?? []) {
        profileMap[p.id] = p.username
      }
    }

    const presenceMap: Record<string, boolean> = {}
    for (const p of presence ?? []) {
      presenceMap[p.user_id] = p.is_online
    }

    const enriched = (channels ?? []).map((ch: OsChannelRow) => ({
      ...ch,
      unread: unreadMap[ch.id] ?? 0,
      displayName: channelDisplayName(ch, user.id, profileMap),
    }))

    const groupChannels = enriched.filter((c) => c.type !== "direct")
    const directChannels = enriched.filter((c) => c.type === "direct")

    const staffTeam = teamMembers
      .filter((m) => m.profile_id && m.profile_id !== user.id)
      .map((m) => ({
        ...m,
        username: m.profile_id ? (profileMap[m.profile_id] ?? m.email.split("@")[0]) : null,
        is_online: m.profile_id ? (presenceMap[m.profile_id] ?? false) : false,
      }))
      .sort((a, b) => Number(b.is_online) - Number(a.is_online))

    try {
      await supabase.rpc("update_presence", { p_online: true })
    } catch {
      // best-effort presence ping
    }

    return NextResponse.json({
      channels: enriched,
      groupChannels,
      directChannels,
      currentUserId: user.id,
      currentUserOnline: presenceMap[user.id] ?? true,
      profileMap,
      staffTeam,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load channels"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireStaffSession()
    const body = (await request.json()) as { staffId?: string }
    const otherId = body.staffId?.trim()

    if (!otherId || otherId === user.id) {
      return NextResponse.json({ error: "Invalid staff member" }, { status: 400 })
    }

    const name = dmChannelName(user.id, otherId)

    let { data: ch } = await supabase
      .from("os_channels")
      .select("id")
      .eq("name", name)
      .maybeSingle()

    if (!ch) {
      const { data: created, error } = await supabase
        .from("os_channels")
        .insert({ name, type: "direct", created_by: user.id })
        .select("id")
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      ch = created

      const { error: memberErr } = await supabase.from("os_channel_members").upsert(
        [
          { channel_id: ch.id, staff_id: user.id },
          { channel_id: ch.id, staff_id: otherId },
        ],
        { onConflict: "channel_id,staff_id", ignoreDuplicates: true },
      )

      if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 })
    }

    return NextResponse.json({ channelId: ch.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create DM"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
