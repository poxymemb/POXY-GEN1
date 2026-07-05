import { NextResponse } from "next/server"
import { getMktInfluencers } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

export async function GET(request: Request) {
  try {
    await requireStaffSession()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")?.toLowerCase() ?? "all"
    const influencers = await getMktInfluencers(status === "all" ? undefined : status)
    return NextResponse.json({ influencers })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load influencers"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireStaffSession()
    const body = (await request.json()) as {
      name?: string
      platform?: string
      handle?: string | null
      followers_count?: number | null
      niche?: string | null
      status?: string
      notes?: string | null
      deal_terms?: string | null
      result_notes?: string | null
    }

    const name = body.name?.trim()
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })

    const { data, error } = await supabase
      .from("mkt_influencers")
      .insert({
        name,
        platform: body.platform ?? "tiktok",
        handle: body.handle?.trim() || null,
        followers_count: body.followers_count ?? null,
        niche: body.niche?.trim() || null,
        status: body.status ?? "prospect",
        notes: body.notes?.trim() || null,
        deal_terms: body.deal_terms?.trim() || null,
        result_notes: body.result_notes?.trim() || null,
        created_by: user.id,
      })
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const influencers = await getMktInfluencers()
    return NextResponse.json({ influencer: data, influencers })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add influencer"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase } = await requireStaffSession()
    const body = (await request.json()) as {
      id?: string
      name?: string
      platform?: string
      handle?: string | null
      followers_count?: number | null
      niche?: string | null
      status?: string
      notes?: string | null
      deal_terms?: string | null
      result_notes?: string | null
    }

    const id = body.id?.trim()
    const name = body.name?.trim()
    if (!id || !name) return NextResponse.json({ error: "Id and name required" }, { status: 400 })

    const { data, error } = await supabase
      .from("mkt_influencers")
      .update({
        name,
        platform: body.platform ?? "tiktok",
        handle: body.handle?.trim() || null,
        followers_count: body.followers_count ?? null,
        niche: body.niche?.trim() || null,
        status: body.status ?? "prospect",
        notes: body.notes?.trim() || null,
        deal_terms: body.deal_terms?.trim() || null,
        result_notes: body.result_notes?.trim() || null,
      })
      .eq("id", id)
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const influencers = await getMktInfluencers()
    return NextResponse.json({ influencer: data, influencers })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update influencer"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase } = await requireStaffSession()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Influencer id required" }, { status: 400 })

    const { error } = await supabase.from("mkt_influencers").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete influencer"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
