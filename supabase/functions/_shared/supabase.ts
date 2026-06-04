// =============================================================================
// Supabase clients for Edge Functions.
//   - adminClient(): service-role, bypasses RLS, used for ledger writes.
//   - userClientFromRequest(): scoped to the caller's JWT, used to identify the
//     authenticated user (auth.uid()) and to honor RLS for reads.
// =============================================================================

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function userClientFromRequest(req: Request): SupabaseClient {
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Resolve the authenticated user id from the request JWT, or null. */
export async function getUserId(req: Request): Promise<string | null> {
  const client = userClientFromRequest(req);
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id;
}
