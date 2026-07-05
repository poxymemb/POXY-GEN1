import { NextResponse } from "next/server"
import { getTelemetryStats } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

export async function GET() {
  try {
    await requireStaffSession()
    const stats = await getTelemetryStats()
    return NextResponse.json({ stats })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load telemetry"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
