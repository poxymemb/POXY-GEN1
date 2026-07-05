import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getMktCampaigns } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"
import {
  appendTrafficNote,
  groupRegistrationsByDay,
  parseTrafficFromNotes,
  type TrafficRow,
} from "@/lib/mcu-marketing"

async function getEmailSubscriberCount(): Promise<number> {
  const tables = ["landing_email_subscribers", "email_subscribers"]
  for (const table of tables) {
    const { count, error } = await supabaseAdmin
      .from(table)
      .select("*", { count: "exact", head: true })
    if (!error && count != null) return count
  }
  return 0
}

export async function GET(request: Request) {
  try {
    await requireStaffSession()
    const { searchParams } = new URL(request.url)
    const period = parseInt(searchParams.get("period") ?? "7", 10)
    const since = new Date(Date.now() - period * 86_400_000).toISOString()

    const [{ data: profiles, error: profErr }, campaigns, subscriberCount] = await Promise.all([
      supabaseAdmin.from("profiles").select("created_at").gte("created_at", since),
      getMktCampaigns(),
      getEmailSubscriberCount(),
    ])

    if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 })

    const registrations = groupRegistrationsByDay(profiles ?? [], period)

    const traffic: TrafficRow[] = []
    for (const campaign of campaigns) {
      const parsed = parseTrafficFromNotes(campaign.result_notes)
      for (const row of parsed) {
        traffic.push({
          ...row,
          campaignId: campaign.id,
          campaignName: campaign.name,
        })
      }
    }
    traffic.sort((a, b) => b.visits - a.visits)

    return NextResponse.json({
      period,
      registrations,
      traffic,
      subscriberCount,
      campaigns: campaigns.map((c) => ({ id: c.id, name: c.name })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load analytics"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const { supabase } = await requireStaffSession()
    const body = (await request.json()) as {
      type?: "traffic"
      source?: string
      visits?: number
      campaignId?: string
    }

    if (body.type !== "traffic") {
      return NextResponse.json({ error: "Only traffic data points supported" }, { status: 400 })
    }

    const source = body.source?.trim()
    const visits = body.visits ?? 0
    const campaignId = body.campaignId?.trim()

    if (!source || visits <= 0) {
      return NextResponse.json({ error: "Source and visits required" }, { status: 400 })
    }
    if (!campaignId) {
      return NextResponse.json({ error: "Campaign required for traffic data" }, { status: 400 })
    }

    const { data: campaign, error: fetchErr } = await supabase
      .from("mkt_campaigns")
      .select("result_notes")
      .eq("id", campaignId)
      .maybeSingle()

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

    const result_notes = appendTrafficNote(campaign.result_notes, source, visits)

    const { error } = await supabase
      .from("mkt_campaigns")
      .update({ result_notes })
      .eq("id", campaignId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add data point"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
