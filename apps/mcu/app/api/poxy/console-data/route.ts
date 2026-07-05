import { NextResponse } from "next/server"
import { getDisputes, getPlayers, getPoxyMetrics } from "@/lib/queries"

export async function GET() {
  try {
    const [tickets, players, metrics] = await Promise.all([
      getDisputes(),
      getPlayers(),
      getPoxyMetrics(),
    ])

    return NextResponse.json({ tickets, players, metrics })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load console data"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
