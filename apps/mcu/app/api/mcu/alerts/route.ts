import { NextResponse } from "next/server"
import { getActiveAlerts } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

export async function GET() {
  try {
    await requireStaffSession()
    const alerts = await getActiveAlerts()
    return NextResponse.json({ alerts })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load alerts"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
