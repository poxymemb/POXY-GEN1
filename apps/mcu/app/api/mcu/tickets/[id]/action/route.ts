import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getTicketById } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

type RouteContext = { params: Promise<{ id: string }> }

type ActionBody = {
  action?: string
  reason?: string
  assign_to?: string
  days?: number
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user, supabase } = await requireStaffSession()
    const { id } = await context.params
    const body = (await request.json()) as ActionBody
    const action = body.action

    const ticket = await getTicketById(id)
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    switch (action) {
      case "assign_me": {
        const { error } = await supabaseAdmin
          .from("support_tickets")
          .update({
            assigned_to: user.id,
            status: "in_progress",
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }

      case "in_progress": {
        const { error } = await supabaseAdmin
          .from("support_tickets")
          .update({ status: "in_progress", updated_at: new Date().toISOString() })
          .eq("id", id)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }

      case "escalate": {
        const reason = body.reason?.trim()
        const assignTo = body.assign_to
        if (!reason) {
          return NextResponse.json({ error: "Escalation reason required" }, { status: 400 })
        }
        if (!assignTo) {
          return NextResponse.json({ error: "Assignee required" }, { status: 400 })
        }

        const { error } = await supabase.rpc("escalate_ticket", {
          p_ticket_id: id,
          p_assign_to: assignTo,
          p_reason: reason,
        })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }

      case "close": {
        const { error } = await supabase.rpc("close_support_ticket", { p_ticket_id: id })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }

      case "mark_abuse": {
        const reason = body.reason?.trim()
        if (!reason) {
          return NextResponse.json({ error: "Abuse reason required" }, { status: 400 })
        }

        const { error } = await supabase.rpc("mark_ticket_abuse", {
          p_ticket_id: id,
          p_reason: reason,
        })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }

      case "ban_user": {
        const reason = body.reason?.trim()
        const days = body.days ?? 7
        if (!reason) {
          return NextResponse.json({ error: "Ban reason required" }, { status: 400 })
        }

        const { error } = await supabase.rpc("ban_ticket_user", {
          p_user_id: ticket.user_id,
          p_days: days,
          p_reason: reason,
        })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }

    const updated = await getTicketById(id)
    return NextResponse.json({ ticket: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
