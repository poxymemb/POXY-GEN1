import { NextResponse } from "next/server"
import { getEconomyHealth } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

export async function GET() {
  try {
    await requireStaffSession()
    const economy = await getEconomyHealth()
    return NextResponse.json({ economy })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load economy data"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
