import { NextResponse } from "next/server"
import { createQuickReply, getQuickReplies } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

const VALID_CATEGORIES = new Set(["technical", "economy", "marketplace", "general", "refusals"])

export async function GET(request: Request) {
  try {
    await requireStaffSession()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") ?? undefined
    const replies = await getQuickReplies(category)
    return NextResponse.json({ replies })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load quick replies"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireStaffSession()
    const body = (await request.json()) as {
      title?: string
      body?: string
      category?: string
    }

    const title = body.title?.trim()
    const text = body.body?.trim()
    const category = body.category?.trim() || "general"

    if (!title || !text) {
      return NextResponse.json({ error: "Title and body required" }, { status: 400 })
    }
    if (!VALID_CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 })
    }

    const reply = await createQuickReply({
      title,
      body: text,
      category,
      createdBy: user.id,
    })

    const replies = await getQuickReplies()
    return NextResponse.json({ reply, replies })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create quick reply"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
