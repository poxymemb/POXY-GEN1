import { NextResponse } from "next/server"
import { getTicketById, getTicketMessages, getTicketPlayerSnapshot } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireStaffSession()
    const { id } = await context.params

    const [messages, ticket, snapshot] = await Promise.all([
      getTicketMessages(id),
      getTicketById(id),
      getTicketById(id).then((t) => (t ? getTicketPlayerSnapshot(t.user_id) : null)),
    ])

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    return NextResponse.json({ ticket, messages, snapshot })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load messages"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user, supabase } = await requireStaffSession()
    const { id } = await context.params
    const body = (await request.json()) as { body?: string }

    const text = body.body?.trim()
    if (!text) {
      return NextResponse.json({ error: "Message body required" }, { status: 400 })
    }

    const { error: insertError } = await supabase.from("ticket_messages").insert({
      ticket_id: id,
      sender_id: user.id,
      is_staff: true,
      body: text,
      is_auto: false,
    })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    await supabase.from("support_tickets").update({ updated_at: new Date().toISOString() }).eq("id", id)

    const messages = await getTicketMessages(id)
    return NextResponse.json({ messages })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send message"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
