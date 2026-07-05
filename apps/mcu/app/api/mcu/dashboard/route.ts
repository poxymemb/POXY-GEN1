import { NextResponse } from "next/server"
import { getMcuDashboardStats } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

export async function GET() {
  try {
    const { user } = await requireStaffSession()
    const stats = await getMcuDashboardStats(user.id)
    return NextResponse.json({ stats })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load dashboard"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
