import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getOsTaskById, getOsTasks } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireStaffSession()
    const { id } = await context.params
    const task = await getOsTaskById(id)
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 })
    return NextResponse.json({ task })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load task"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { user, supabase } = await requireStaffSession()
    const { id } = await context.params
    const body = (await request.json()) as {
      title?: string
      description?: string | null
      priority?: string
      status?: string
      department?: string | null
      assigned_to?: string | null
      due_date?: string | null
      add_subtask?: { title: string }
      toggle_subtask?: { id: string; completed: boolean }
      add_comment?: { body: string }
    }

    if (body.add_subtask?.title?.trim()) {
      const existing = await getOsTaskById(id)
      const sort_order = existing?.os_task_subtasks.length ?? 0
      const { error } = await supabase.from("os_task_subtasks").insert({
        task_id: id,
        title: body.add_subtask.title.trim(),
        sort_order,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (body.toggle_subtask) {
      const { error } = await supabase
        .from("os_task_subtasks")
        .update({
          completed: body.toggle_subtask.completed,
          completed_by: body.toggle_subtask.completed ? user.id : null,
          completed_at: body.toggle_subtask.completed ? new Date().toISOString() : null,
        })
        .eq("id", body.toggle_subtask.id)
        .eq("task_id", id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (body.add_comment?.body?.trim()) {
      const { error } = await supabase.from("os_task_comments").insert({
        task_id: id,
        author_id: user.id,
        body: body.add_comment.body.trim(),
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const hasTaskFields =
      body.title !== undefined ||
      body.description !== undefined ||
      body.priority !== undefined ||
      body.status !== undefined ||
      body.department !== undefined ||
      body.assigned_to !== undefined ||
      body.due_date !== undefined

    if (hasTaskFields) {
      const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (body.title !== undefined) row.title = body.title.trim()
      if (body.description !== undefined) row.description = body.description?.trim() || null
      if (body.priority !== undefined) row.priority = body.priority
      if (body.status !== undefined) row.status = body.status
      if (body.department !== undefined) row.department = body.department
      if (body.assigned_to !== undefined) row.assigned_to = body.assigned_to || null
      if (body.due_date !== undefined) row.due_date = body.due_date || null

      const { error } = await supabaseAdmin.from("os_tasks").update(row).eq("id", id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const task = await getOsTaskById(id)
    return NextResponse.json({ task })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update task"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireStaffSession()
    const { id } = await context.params

    const { error } = await supabaseAdmin.from("os_tasks").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete task"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
