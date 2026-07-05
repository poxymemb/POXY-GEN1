import { NextResponse } from "next/server"
import { getOsChangelog } from "@/lib/queries"
import { canEditChangelog } from "@/lib/mcu-handbook"
import { requireStaffSession } from "@/lib/mcu-auth"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { supabase, role } = await requireStaffSession()
    const { id } = await context.params

    if (!canEditChangelog(role)) {
      return NextResponse.json({ error: "Mod or superadmin only" }, { status: 403 })
    }

    const body = (await request.json()) as {
      version?: string
      category?: string
      title?: string
      description?: string
      affects_gameplay?: boolean
    }

    const version = body.version?.trim()
    const title = body.title?.trim()
    const description = body.description?.trim()

    if (!version || !title || !description) {
      return NextResponse.json({ error: "Version, title, and description required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("os_changelog")
      .update({
        version,
        category: body.category ?? "feature",
        title,
        description,
        affects_gameplay: body.affects_gameplay ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const entries = await getOsChangelog()
    return NextResponse.json({ entry: data, entries })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update entry"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { supabase, role } = await requireStaffSession()
    const { id } = await context.params

    if (!canEditChangelog(role)) {
      return NextResponse.json({ error: "Mod or superadmin only" }, { status: 403 })
    }

    const { error } = await supabase.from("os_changelog").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const entries = await getOsChangelog()
    return NextResponse.json({ entries })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete entry"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
