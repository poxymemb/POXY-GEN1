import { NextResponse } from "next/server"
import { getMcuUpdates } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { supabase } = await requireStaffSession()
    const { id } = await context.params

    const { error } = await supabase.rpc("confirm_update_read", { p_update_id: id })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const updates = await getMcuUpdates()
    return NextResponse.json({ updates })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to confirm read"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
