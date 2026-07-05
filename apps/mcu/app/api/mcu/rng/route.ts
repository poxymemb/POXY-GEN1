import { NextResponse } from "next/server"
import { getRngProof, getRngRecentRounds } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

export async function GET(request: Request) {
  try {
    await requireStaffSession()

    const { searchParams } = new URL(request.url)
    const roundId = searchParams.get("round_id") ?? searchParams.get("id")

    if (roundId) {
      const proof = await getRngProof(roundId)
      if (!proof) {
        return NextResponse.json({ error: "Round not found" }, { status: 404 })
      }
      return NextResponse.json({ proof })
    }

    const recent = await getRngRecentRounds(50)
    return NextResponse.json({ recent })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load RNG data"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
