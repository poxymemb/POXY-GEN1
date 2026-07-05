import { NextResponse } from "next/server"
import { deleteQuickReply, getQuickReplies, updateQuickReply } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

type RouteContext = { params: Promise<{ id: string }> }

const VALID_CATEGORIES = new Set(["technical", "economy", "marketplace", "general", "refusals"])

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireStaffSession()
    const { id } = await context.params
    const body = (await request.json()) as {
      title?: string
      body?: string
      category?: string
    }

    const patch: { title?: string; body?: string; category?: string } = {}
    if (body.title !== undefined) patch.title = body.title.trim()
    if (body.body !== undefined) patch.body = body.body.trim()
    if (body.category !== undefined) {
      if (!VALID_CATEGORIES.has(body.category)) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 })
      }
      patch.category = body.category
    }

    if (!patch.title && !patch.body && !patch.category) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    const reply = await updateQuickReply(id, patch)
    const replies = await getQuickReplies()
    return NextResponse.json({ reply, replies })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update quick reply"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireStaffSession()
    const { id } = await context.params
    await deleteQuickReply(id)
    const replies = await getQuickReplies()
    return NextResponse.json({ replies })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete quick reply"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
