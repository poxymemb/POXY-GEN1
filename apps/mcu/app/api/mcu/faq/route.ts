import { NextResponse } from "next/server"
import { createFaqEntry, getFaqEntries } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

export async function GET() {
  try {
    await requireStaffSession()
    const entries = await getFaqEntries()
    return NextResponse.json({ entries })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load FAQ"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    await requireStaffSession()
    const body = (await request.json()) as {
      question?: string
      answer?: string
      category?: string
      is_published?: boolean
      is_active?: boolean
    }

    const question = body.question?.trim()
    const answer = body.answer?.trim()
    const category = body.category?.trim() || "general"
    const is_active = body.is_published ?? body.is_active ?? true

    if (!question || !answer) {
      return NextResponse.json({ error: "Question and answer required" }, { status: 400 })
    }

    await createFaqEntry({ question, answer, category, is_active })
    const entries = await getFaqEntries()
    return NextResponse.json({ entries })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create FAQ entry"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
