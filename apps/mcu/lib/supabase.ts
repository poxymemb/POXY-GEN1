import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let supabaseClient: SupabaseClient | null = null
let supabaseAdminClient: SupabaseClient | null = null

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL")
  return url
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY")
  return key
}

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")
  return key
}

/** Browser-safe anon client (auth, public reads). */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!supabaseClient) {
      supabaseClient = createClient(getSupabaseUrl(), getSupabaseAnonKey())
    }
    return Reflect.get(supabaseClient, prop, receiver)
  },
})

/** Server-only admin client — bypasses RLS. Never expose to the client. */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!supabaseAdminClient) {
      supabaseAdminClient = createClient(getSupabaseUrl(), getServiceRoleKey(), {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    }
    return Reflect.get(supabaseAdminClient, prop, receiver)
  },
})
