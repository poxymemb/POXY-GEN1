import { NextResponse } from "next/server"
import { getOsTasks } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

export async function GET(request: Request) {
  try {
    const { user } = await requireStaffSession()
    const { searchParams } = new URL(request.url)

    const mine = searchParams.get("mine") === "true"
    const status = searchParams.get("status") ?? undefined
    const priority = searchParams.get("priority") ?? undefined
    const department = searchParams.get("department") ?? undefined
    const assignee = searchParams.get("assignee") ?? undefined

    const tasks = await getOsTasks({
      assignedTo: mine ? user.id : assignee && assignee !== "all" ? assignee : undefined,
      status,
      priority,
      department,
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load tasks"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireStaffSession()
    const body = (await request.json()) as {
      title?: string
      description?: string
      priority?: string
      department?: string
      assigned_to?: string | null
      due_date?: string | null
      status?: string
    }

    const title = body.title?.trim()
    if (!title) {
      return NextResponse.json({ error: "Title required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("os_tasks")
      .insert({
        title,
        description: body.description?.trim() || null,
        priority: body.priority ?? "normal",
        department: body.department ?? "support",
        assigned_to: body.assigned_to || null,
        due_date: body.due_date || null,
        status: body.status ?? "todo",
        created_by: user.id,
      })
      .select("id")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const tasks = await getOsTasks()
    return NextResponse.json({ taskId: data.id, tasks })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create task"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
