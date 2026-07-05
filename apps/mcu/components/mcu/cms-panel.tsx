"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { NewsPostRow } from "@/lib/queries"
import { formatDateTime } from "@/lib/mcu-utils"

export function CmsModule() {
  const [posts, setPosts] = useState<NewsPostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [published, setPublished] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/mcu/cms")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load posts")
      setPosts(data.posts ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) {
      setError("Title and body required")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/mcu/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), published }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to create post")
      setPosts(data.posts ?? [])
      setTitle("")
      setBody("")
      setPublished(true)
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
        <div>
          <h1 className="font-mono text-sm font-semibold uppercase tracking-widest text-foreground">Content CMS</h1>
          <p className="font-mono text-[10px] text-muted-foreground">POXY WORLD // News Posts</p>
        </div>
        <Button variant="outline" size="xs" onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-3.5" /> New Post
        </Button>
      </header>

      {showForm && (
        <form onSubmit={(e) => void handleCreate(e)} className="border-b border-border px-5 py-4">
          <div className="mx-auto max-w-2xl space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/30"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Post body"
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/30"
            />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="rounded border-border"
              />
              Published
            </label>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : "Save post"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}

      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-2 font-mono text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">No posts yet</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 border-b border-border bg-background/95 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-5 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Author</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-5 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-border/60 hover:bg-sidebar-accent/30">
                  <td className="max-w-md truncate px-5 py-2.5 text-foreground">{post.title}</td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">
                    @{post.author_username ?? "staff"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={
                        post.published
                          ? "font-mono text-[10px] text-emerald-400"
                          : "font-mono text-[10px] text-yellow-400"
                      }
                    >
                      {post.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-2.5 font-mono text-muted-foreground">
                    {formatDateTime(post.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
