import { NextResponse } from "next/server"
import { requireStaffSession } from "@/lib/mcu-auth"

export async function GET() {
  try {
    const { user, supabase } = await requireStaffSession()

    const { data, error } = await supabase
      .from("os_notes")
      .select("*")
      .eq("staff_id", user.id)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ notes: data ?? [], currentUserId: user.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load notes"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireStaffSession()
    const body = (await request.json()) as {
      title?: string
      body?: string
      tags?: string[]
    }

    const { data, error } = await supabase
      .from("os_notes")
      .insert({
        staff_id: user.id,
        title: body.title?.trim() || "Untitled",
        body: body.body ?? "",
        tags: body.tags ?? [],
        is_pinned: false,
      })
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ note: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create note"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
