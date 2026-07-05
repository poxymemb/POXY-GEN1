import { NextResponse } from "next/server"
import { getAutoMessages, updateAutoMessage, upsertAutoMessageByTrigger } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

export async function GET() {
  try {
    await requireStaffSession()
    const messages = await getAutoMessages()
    return NextResponse.json({ messages })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load auto messages"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    await requireStaffSession()
    const body = (await request.json()) as {
      id?: string
      trigger?: string
      body?: string
      is_active?: boolean
    }

    if (body.id) {
      const patch: { body?: string; is_active?: boolean } = {}
      if (body.body !== undefined) patch.body = body.body.trim()
      if (body.is_active !== undefined) patch.is_active = body.is_active

      if (Object.keys(patch).length === 0) {
        return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
      }

      const message = await updateAutoMessage(body.id, patch)
      const messages = await getAutoMessages()
      return NextResponse.json({ message, messages })
    }

    if (body.trigger && body.body !== undefined) {
      const message = await upsertAutoMessageByTrigger({
        trigger: body.trigger,
        body: body.body.trim(),
        is_active: body.is_active,
      })
      const messages = await getAutoMessages()
      return NextResponse.json({ message, messages })
    }

    return NextResponse.json({ error: "id or trigger required" }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update auto message"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
