import { NextResponse } from "next/server"
import { getAuditLog } from "@/lib/queries"

export async function GET() {
  try {
    const logs = await getAuditLog(100)
    return NextResponse.json({ logs })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load audit log"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
