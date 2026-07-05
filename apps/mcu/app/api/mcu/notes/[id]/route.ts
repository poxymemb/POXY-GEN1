import { NextResponse } from "next/server"
import { requireStaffSession } from "@/lib/mcu-auth"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { user, supabase } = await requireStaffSession()
    const { id } = await context.params
    const body = (await request.json()) as {
      title?: string
      body?: string
      tags?: string[]
      is_pinned?: boolean
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.title !== undefined) patch.title = body.title.trim() || "Untitled"
    if (body.body !== undefined) patch.body = body.body
    if (body.tags !== undefined) patch.tags = body.tags
    if (body.is_pinned !== undefined) patch.is_pinned = body.is_pinned

    const { data, error } = await supabase
      .from("os_notes")
      .update(patch)
      .eq("id", id)
      .eq("staff_id", user.id)
      .select("*")
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: "Note not found" }, { status: 404 })

    return NextResponse.json({ note: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update note"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { user, supabase } = await requireStaffSession()
    const { id } = await context.params

    const { error } = await supabase.from("os_notes").delete().eq("id", id).eq("staff_id", user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete note"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
