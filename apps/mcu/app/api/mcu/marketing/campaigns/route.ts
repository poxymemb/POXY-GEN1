import { NextResponse } from "next/server"
import { getMktCampaigns } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

export async function GET(request: Request) {
  try {
    await requireStaffSession()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")?.toLowerCase() ?? "all"
    const campaigns = await getMktCampaigns(status === "all" ? undefined : status)
    return NextResponse.json({ campaigns })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load campaigns"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireStaffSession()
    const body = (await request.json()) as {
      name?: string
      description?: string | null
      status?: string
      platform?: string[]
      start_date?: string | null
      end_date?: string | null
      goal?: string | null
      budget_pc?: number
      result_notes?: string | null
    }

    const name = body.name?.trim()
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })

    const { data, error } = await supabase
      .from("mkt_campaigns")
      .insert({
        name,
        description: body.description?.trim() || null,
        status: body.status ?? "draft",
        platform: body.platform ?? [],
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        goal: body.goal?.trim() || null,
        budget_pc: body.budget_pc ?? 0,
        result_notes: body.result_notes?.trim() || null,
        created_by: user.id,
      })
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const campaigns = await getMktCampaigns()
    return NextResponse.json({ campaign: data, campaigns })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create campaign"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase } = await requireStaffSession()
    const body = (await request.json()) as {
      id?: string
      action?: "pause" | "update"
      name?: string
      description?: string | null
      status?: string
      platform?: string[]
      start_date?: string | null
      end_date?: string | null
      goal?: string | null
      budget_pc?: number
      result_notes?: string | null
    }

    const id = body.id?.trim()
    if (!id) return NextResponse.json({ error: "Campaign id required" }, { status: 400 })

    if (body.action === "pause") {
      const { data: current, error: fetchErr } = await supabase
        .from("mkt_campaigns")
        .select("status")
        .eq("id", id)
        .maybeSingle()

      if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
      if (!current) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

      const next =
        current.status === "active" ? "paused" : current.status === "paused" ? "active" : null
      if (!next) {
        return NextResponse.json({ error: "Only active/paused campaigns can toggle" }, { status: 400 })
      }

      const { data, error } = await supabase
        .from("mkt_campaigns")
        .update({ status: next })
        .eq("id", id)
        .select("*")
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const campaigns = await getMktCampaigns()
      return NextResponse.json({ campaign: data, campaigns })
    }

    const name = body.name?.trim()
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })

    const { data, error } = await supabase
      .from("mkt_campaigns")
      .update({
        name,
        description: body.description?.trim() || null,
        status: body.status ?? "draft",
        platform: body.platform ?? [],
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        goal: body.goal?.trim() || null,
        budget_pc: body.budget_pc ?? 0,
        result_notes: body.result_notes?.trim() || null,
      })
      .eq("id", id)
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const campaigns = await getMktCampaigns()
    return NextResponse.json({ campaign: data, campaigns })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update campaign"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
