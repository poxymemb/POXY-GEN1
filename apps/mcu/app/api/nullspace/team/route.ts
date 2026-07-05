import { NextResponse } from "next/server"
import { getStaff } from "@/lib/queries"

export async function GET() {
  try {
    const staff = await getStaff()
    return NextResponse.json({ staff })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load staff"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
