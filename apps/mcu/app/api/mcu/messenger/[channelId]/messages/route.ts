import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import {
  channelDescription,
  channelDisplayName,
} from "@/lib/mcu-messenger"
import {
  enrichOsMessages,
  getMemberCounts,
  type OsChannelRow,
} from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

type RouteContext = { params: Promise<{ channelId: string }> }

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { user, supabase } = await requireStaffSession()
    const { channelId } = await context.params

    const { data: channel, error: chErr } = await supabaseAdmin
      .from("os_channels")
      .select("*")
      .eq("id", channelId)
      .maybeSingle()

    if (chErr) return NextResponse.json({ error: chErr.message }, { status: 500 })
    if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 })

    const { data: membership } = await supabaseAdmin
      .from("os_channel_members")
      .select("staff_id")
      .eq("channel_id", channelId)
      .eq("staff_id", user.id)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: "Not a channel member" }, { status: 403 })
    }

    const [{ data: messages, error: msgErr }, memberCounts] = await Promise.all([
      supabaseAdmin
        .from("os_messages")
        .select("*")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true })
        .limit(300),
      getMemberCounts([channelId]),
    ])

    if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

    await supabase.from("os_message_reads").upsert(
      {
        channel_id: channelId,
        staff_id: user.id,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: "channel_id,staff_id" },
    )

    const profileMap: Record<string, string | null> = {}
    if (channel.type === "direct") {
      const parts = channel.name.replace(/^dm_/, "").split("_")
      const ids = parts.filter(Boolean)
      if (ids.length) {
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id, username")
          .in("id", ids)
        for (const p of profiles ?? []) {
          profileMap[p.id] = p.username
        }
      }
    }

    const enriched = await enrichOsMessages(messages ?? [])

    return NextResponse.json({
      channel: {
        ...(channel as OsChannelRow),
        displayName: channelDisplayName(channel as OsChannelRow, user.id, profileMap),
        description: channelDescription(channel as OsChannelRow),
        memberCount: memberCounts[channelId] ?? 0,
      },
      messages: enriched,
      currentUserId: user.id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load messages"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user, supabase } = await requireStaffSession()
    const { channelId } = await context.params
    const body = (await request.json()) as {
      body?: string
      attachment_type?: string | null
      attachment_ref?: string | null
      attachment_url?: string | null
    }

    const text = body.body?.trim()
    if (!text && !body.attachment_ref) {
      return NextResponse.json({ error: "Message body or attachment required" }, { status: 400 })
    }

    const { data: membership } = await supabase
      .from("os_channel_members")
      .select("staff_id")
      .eq("channel_id", channelId)
      .eq("staff_id", user.id)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: "Not a channel member" }, { status: 403 })
    }

    const { data: message, error } = await supabase
      .from("os_messages")
      .insert({
        channel_id: channelId,
        sender_id: user.id,
        body: text || null,
        attachment_type: body.attachment_type ?? null,
        attachment_ref: body.attachment_ref ?? null,
        attachment_url: body.attachment_url ?? null,
        is_system: false,
      })
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const [enriched] = await enrichOsMessages([message])

    return NextResponse.json({ message: enriched })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send message"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
