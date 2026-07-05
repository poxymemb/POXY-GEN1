import { NextResponse } from "next/server"
import { getDisputesView } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

export async function GET(request: Request) {
  try {
    await requireStaffSession()

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter") ?? "ALL"

    const { rows, stats } = await getDisputesView(filter)
    return NextResponse.json({ rows, stats })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load disputes"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
