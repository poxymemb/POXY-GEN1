"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        return
      }

      const next = searchParams.get("next")
      router.push(next && next.startsWith("/") ? next : "/mcu")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dark flex min-h-screen items-center justify-center bg-black px-6 py-12">
      <div className="w-full max-w-md border border-zinc-800 bg-zinc-950/80 p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-400">
          NULLSPACE LAB // MCU ACCESS
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-zinc-500"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 w-full border border-zinc-800 bg-black px-3 font-mono text-sm text-zinc-100 outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-zinc-500"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-10 w-full border border-zinc-800 bg-black px-3 font-mono text-sm text-zinc-100 outline-none focus:border-zinc-600"
            />
          </div>

          {error && (
            <p className="border border-red-900/60 bg-red-950/40 px-3 py-2 font-mono text-xs text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-10 w-full border border-zinc-700 bg-zinc-100 font-mono text-xs font-medium uppercase tracking-widest text-black transition-colors hover:bg-white disabled:opacity-50"
          >
            {loading ? "Authenticating…" : "Enter MCU"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="dark flex min-h-screen items-center justify-center bg-black">
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Loading…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
