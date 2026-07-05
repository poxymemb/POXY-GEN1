import { NextResponse } from "next/server"
import { getMcuUpdates, getStaffProfiles } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"
import { filterTabToDbType } from "@/lib/mcu-updates-meta"

export async function GET(request: Request) {
  try {
    const { user, role } = await requireStaffSession()
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter") ?? "ALL"
    const dbType = filter !== "ALL" ? filterTabToDbType(filter as "URGENT") : null

    const [updates, staffProfiles] = await Promise.all([
      getMcuUpdates(dbType),
      getStaffProfiles(),
    ])

    const urgentUnread = updates.filter(
      (u) =>
        u.type === "urgent" &&
        !u.mcu_update_reads.some((r) => r.staff_id === user.id && (r.confirmed || r.read_at)),
    )

    return NextResponse.json({
      updates,
      staffProfiles,
      currentUserId: user.id,
      canPublish: role === "superadmin",
      urgentUnread,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load updates"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase, role } = await requireStaffSession()

    if (role !== "superadmin") {
      return NextResponse.json({ error: "Superadmin only" }, { status: 403 })
    }

    const body = (await request.json()) as {
      type?: string
      title?: string
      body?: string
      is_pinned?: boolean
      requires_confirmation?: boolean
    }

    const title = body.title?.trim()
    const content = body.body?.trim()
    if (!title || !content) {
      return NextResponse.json({ error: "Title and body required" }, { status: 400 })
    }

    const { error } = await supabase.from("mcu_updates").insert({
      type: body.type ?? "general",
      title,
      body: content,
      is_pinned: body.is_pinned ?? false,
      requires_confirmation: body.requires_confirmation ?? false,
      published_by: user.id,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const updates = await getMcuUpdates()
    return NextResponse.json({ updates })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to publish update"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
