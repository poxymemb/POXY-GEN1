import { supabaseAdmin } from "@/lib/supabase"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { SupabaseClient, User } from "@supabase/supabase-js"

export type StaffSession = {
  user: User
  supabase: SupabaseClient
  role: string
}

export async function requireStaffSession(): Promise<StaffSession> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user?.email) {
    throw new Error("Unauthorized")
  }

  const { data: staff, error: staffError } = await supabaseAdmin
    .from("admin_emails")
    .select("email, role")
    .ilike("email", user.email)
    .maybeSingle()

  if (staffError || !staff) {
    throw new Error("Unauthorized")
  }

  return { user, supabase, role: staff.role }
}
