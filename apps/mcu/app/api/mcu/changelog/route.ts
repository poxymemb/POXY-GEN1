import { NextResponse } from "next/server"
import { getOsChangelog } from "@/lib/queries"
import { canEditChangelog } from "@/lib/mcu-handbook"
import { requireStaffSession } from "@/lib/mcu-auth"

export async function GET(request: Request) {
  try {
    const { role } = await requireStaffSession()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")?.toLowerCase() ?? "all"
    const gameplayOnly = searchParams.get("gameplayOnly") === "true"

    const entries = await getOsChangelog({
      category: category === "all" ? undefined : category,
      gameplayOnly,
    })

    return NextResponse.json({
      entries,
      canEdit: canEditChangelog(role),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load changelog"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase, role } = await requireStaffSession()

    if (!canEditChangelog(role)) {
      return NextResponse.json({ error: "Mod or superadmin only" }, { status: 403 })
    }

    const body = (await request.json()) as {
      version?: string
      category?: string
      title?: string
      description?: string
      affects_gameplay?: boolean
    }

    const version = body.version?.trim()
    const title = body.title?.trim()
    const description = body.description?.trim()

    if (!version || !title || !description) {
      return NextResponse.json({ error: "Version, title, and description required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("os_changelog")
      .insert({
        version,
        category: body.category ?? "feature",
        title,
        description,
        affects_gameplay: body.affects_gameplay ?? false,
        published_by: user.id,
      })
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const entries = await getOsChangelog()
    return NextResponse.json({ entry: data, entries })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to publish entry"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
