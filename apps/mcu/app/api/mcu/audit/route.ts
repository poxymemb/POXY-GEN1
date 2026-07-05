import { NextResponse } from "next/server"
import { getAuditLog } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

export async function GET() {
  try {
    await requireStaffSession()
    const rows = await getAuditLog(100)
    return NextResponse.json({ rows })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load audit log"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
