import { NextResponse } from "next/server"
import {
  deleteFaqEntry,
  getFaqEntries,
  swapFaqOrder,
  updateFaqEntry,
} from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireStaffSession()
    const { id } = await context.params
    const body = (await request.json()) as {
      question?: string
      answer?: string
      category?: string
      is_published?: boolean
      is_active?: boolean
      reorder?: "up" | "down"
    }

    if (body.reorder === "up" || body.reorder === "down") {
      const entries = await swapFaqOrder(id, body.reorder)
      return NextResponse.json({ entries })
    }

    const patch: {
      question?: string
      answer?: string
      category?: string
      is_active?: boolean
    } = {}

    if (body.question !== undefined) patch.question = body.question.trim()
    if (body.answer !== undefined) patch.answer = body.answer.trim()
    if (body.category !== undefined) patch.category = body.category.trim()
    if (body.is_published !== undefined) patch.is_active = body.is_published
    if (body.is_active !== undefined) patch.is_active = body.is_active

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    await updateFaqEntry(id, patch)
    const entries = await getFaqEntries()
    return NextResponse.json({ entries })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update FAQ entry"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireStaffSession()
    const { id } = await context.params
    await deleteFaqEntry(id)
    const entries = await getFaqEntries()
    return NextResponse.json({ entries })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete FAQ entry"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
