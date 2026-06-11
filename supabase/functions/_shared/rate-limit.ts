// =============================================================================
// Rate limiting for Edge Functions — atomic windowed counter via check_rate_limit RPC.
// =============================================================================

import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { json } from "./http.ts";

export async function enforceRateLimit(
  admin: SupabaseClient,
  subject: string,
  action: string,
  maxPerMinute = 30,
): Promise<Response | null> {
  const key = `ratelimit:${action}:${subject}`;
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key,
    p_max: maxPerMinute,
    p_window_seconds: 60,
  });

  if (error) {
    console.error(`rate limit rpc failed (${action}):`, error.message);
    return json({ ok: false, error: "Rate limit check failed" }, 503);
  }

  if (!data) {
    return json({ ok: false, error: "Rate limit exceeded" }, 429);
  }

  return null;
}
