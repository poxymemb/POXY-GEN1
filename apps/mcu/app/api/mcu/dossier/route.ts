import { NextResponse } from "next/server"
import { getPlayerDossier } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

export async function GET(request: Request) {
  try {
    await requireStaffSession()

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("user") ?? searchParams.get("q") ?? ""

    if (!query.trim()) {
      return NextResponse.json({ error: "Query required" }, { status: 400 })
    }

    const dossier = await getPlayerDossier(query)
    if (!dossier) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    return NextResponse.json({ dossier })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load dossier"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const { supabase } = await requireStaffSession()
    const body = (await request.json()) as {
      user_id?: string
      action?: string
      reason?: string
      amount?: number
      days?: number
      frozen?: boolean
    }

    const userId = body.user_id
    const action = body.action
    const reason = body.reason?.trim()

    if (!userId) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 })
    }
    if (!reason) {
      return NextResponse.json({ error: "Reason required" }, { status: 400 })
    }

    switch (action) {
      case "freeze": {
        const frozen = body.frozen ?? true
        const { error } = await supabase.rpc("admin_set_frozen", {
          p_target_id: userId,
          p_frozen: frozen,
        })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        await supabase.rpc("log_admin_action", {
          p_target_user_id: userId,
          p_action_type: frozen ? "freeze" : "unfreeze",
          p_payload: { frozen },
          p_reason: reason,
        })
        break
      }

      case "ban_tickets": {
        const days = body.days ?? 7
        const { error } = await supabase.rpc("ban_ticket_user", {
          p_user_id: userId,
          p_days: days,
          p_reason: reason,
        })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        break
      }

      case "compensate_px": {
        const amount = body.amount ?? 0
        if (amount <= 0) {
          return NextResponse.json({ error: "Positive amount required" }, { status: 400 })
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("balance, px_balance")
          .eq("id", userId)
          .maybeSingle()

        if (profileError || !profile) {
          return NextResponse.json({ error: "Player not found" }, { status: 404 })
        }

        const newBalance = Number(profile.balance ?? 0) + amount
        const newPx = Number(profile.px_balance ?? 0) + Math.floor(amount)

        const { error: balanceError } = await supabase.rpc("admin_set_balance", {
          p_target_id: userId,
          p_amount: newBalance,
        })
        if (balanceError) return NextResponse.json({ error: balanceError.message }, { status: 500 })

        await supabase.from("profiles").update({ px_balance: newPx }).eq("id", userId)

        await supabase.rpc("log_admin_action", {
          p_target_user_id: userId,
          p_action_type: "compensate_pc",
          p_payload: { amount_added: amount, new_balance: newBalance },
          p_reason: reason,
        })
        break
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }

    const dossier = await getPlayerDossier(userId)
    return NextResponse.json({ dossier })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
