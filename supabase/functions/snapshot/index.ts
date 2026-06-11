// =============================================================================
// snapshot — compute Merkle roots + a 24h state checkpoint.
//   state_root = SHA256(asset_root || event_root || balances_hash)
// Intended to run on a schedule (Supabase cron / pg_cron calling this function).
// Restricted to the founder, or to invocations carrying the cron secret.
// =============================================================================

import { adminClient, getUserId, userClientFromRequest } from "../_shared/supabase.ts";
import { handleOptions, json, safeErrorResponse, writeAudit } from "../_shared/http.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const cronSecret = req.headers.get("x-cron-secret");
    const isCron = cronSecret && cronSecret === Deno.env.get("POXY_CRON_SECRET");

    let userId: string | null = null;
    if (!isCron) {
      userId = await getUserId(req);
      if (!userId) return json({ ok: false, error: "Unauthorized" }, 401);
      const userClient = userClientFromRequest(req);
      const { data: founder } = await userClient.rpc("is_founder");
      if (!founder) return json({ ok: false, error: "Founder or cron secret required" }, 403);
    }

    const admin = adminClient();
    const rateSubject = isCron ? "cron:snapshot" : userId!;
    const limited = await enforceRateLimit(admin, rateSubject, "snapshot", 5);
    if (limited) return limited;

    const { data: merkle, error: mErr } = await admin.rpc("compute_merkle_roots");
    if (mErr) return json({ ok: false, error: mErr.message }, 400);

    const { data: snap, error: sErr } = await admin.rpc("create_state_snapshot");
    if (sErr) return json({ ok: false, error: sErr.message }, 400);

    await writeAudit(admin, "ADMIN_ACTION", userId, req, { stage: "snapshot", state_root: snap?.state_root });
    return json({ ok: true, merkle, snapshot: snap });
  } catch (e) {
    return safeErrorResponse(e, "snapshot", 400, "Invalid request");
  }
});
