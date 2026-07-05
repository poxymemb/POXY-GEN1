import { NextResponse } from "next/server"
import { getMktCalendarPosts, getMktCampaigns } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

export async function GET(request: Request) {
  try {
    await requireStaffSession()
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10)
    const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1), 10)

    const [posts, campaigns] = await Promise.all([
      getMktCalendarPosts(year, month),
      getMktCampaigns(),
    ])

    return NextResponse.json({ posts, campaigns, year, month })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load calendar"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireStaffSession()
    const body = (await request.json()) as {
      title?: string
      body?: string | null
      platform?: string
      status?: string
      scheduled_at?: string | null
      asset_url?: string | null
      campaign_id?: string | null
    }

    const title = body.title?.trim()
    if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 })

    const { data, error } = await supabase
      .from("mkt_content_calendar")
      .insert({
        title,
        body: body.body?.trim() || null,
        platform: body.platform ?? "tiktok",
        status: body.status ?? "draft",
        scheduled_at: body.scheduled_at || null,
        asset_url: body.asset_url?.trim() || null,
        campaign_id: body.campaign_id || null,
        created_by: user.id,
      })
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ post: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to schedule post"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase } = await requireStaffSession()
    const body = (await request.json()) as {
      id?: string
      title?: string
      body?: string | null
      platform?: string
      status?: string
      scheduled_at?: string | null
      asset_url?: string | null
      campaign_id?: string | null
    }

    const id = body.id?.trim()
    const title = body.title?.trim()
    if (!id || !title) return NextResponse.json({ error: "Id and title required" }, { status: 400 })

    const { data, error } = await supabase
      .from("mkt_content_calendar")
      .update({
        title,
        body: body.body?.trim() || null,
        platform: body.platform ?? "tiktok",
        status: body.status ?? "draft",
        scheduled_at: body.scheduled_at || null,
        asset_url: body.asset_url?.trim() || null,
        campaign_id: body.campaign_id || null,
      })
      .eq("id", id)
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ post: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update post"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase } = await requireStaffSession()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Post id required" }, { status: 400 })

    const { error } = await supabase.from("mkt_content_calendar").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete post"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
