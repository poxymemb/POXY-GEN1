import { NextResponse } from "next/server"
import { createNewsPost, getNewsPosts } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  try {
    await requireStaffSession()
    const posts = await getNewsPosts()
    return NextResponse.json({ posts })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load posts"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireStaffSession()
    const body = (await request.json()) as {
      title?: string
      body?: string
      published?: boolean
    }

    const title = body.title?.trim()
    const content = body.body?.trim()
    if (!title || !content) {
      return NextResponse.json({ error: "Title and body required" }, { status: 400 })
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle()

    await createNewsPost({
      authorId: user.id,
      authorUsername: profile?.username ?? "staff",
      title,
      body: content,
      published: body.published ?? true,
    })

    const posts = await getNewsPosts()
    return NextResponse.json({ posts })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create post"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
