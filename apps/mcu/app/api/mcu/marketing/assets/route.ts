import { NextResponse } from "next/server"
import { getMktAssets } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

export async function GET() {
  try {
    const { role } = await requireStaffSession()
    const assets = await getMktAssets()
    return NextResponse.json({
      assets,
      canApprove: role === "superadmin" || role === "admin",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load assets"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireStaffSession()
    const body = (await request.json()) as {
      name?: string
      type?: string
      url?: string
      tags?: string[]
      version?: string
    }

    const name = body.name?.trim()
    const url = body.url?.trim()
    if (!name || !url) {
      return NextResponse.json({ error: "Name and URL required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("mkt_assets")
      .insert({
        name,
        type: (body.type ?? "other").toLowerCase(),
        url,
        tags: body.tags ?? [],
        version: body.version?.trim() || "1.0",
        approved: false,
        uploaded_by: user.id,
      })
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const assets = await getMktAssets()
    return NextResponse.json({ asset: data, assets })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload asset"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, supabase, role } = await requireStaffSession()
    const body = (await request.json()) as { id?: string; action?: string }

    if (role !== "superadmin" && role !== "admin") {
      return NextResponse.json({ error: "Superadmin only" }, { status: 403 })
    }

    const id = body.id?.trim()
    if (!id || body.action !== "approve") {
      return NextResponse.json({ error: "Invalid approve request" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("mkt_assets")
      .update({ approved: true, approved_by: user.id })
      .eq("id", id)
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const assets = await getMktAssets()
    return NextResponse.json({ asset: data, assets })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to approve asset"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
