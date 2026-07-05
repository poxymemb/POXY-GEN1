import { NextResponse } from "next/server"
import { getUserMatrix } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

export async function GET(request: Request) {
  try {
    await requireStaffSession()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") ?? undefined
    const rows = await getUserMatrix(search)
    return NextResponse.json({ rows })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load users"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
