import { NextResponse } from "next/server"
import { getSupportTickets } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

export async function GET(request: Request) {
  try {
    await requireStaffSession()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search") ?? undefined

    const tickets = await getSupportTickets({
      status:
        status === "open" || status === "in_progress" || status === "closed" || status === "abuse"
          ? status
          : undefined,
      search,
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load tickets"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
