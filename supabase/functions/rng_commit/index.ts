// =============================================================================
// rng_commit — start a provably-fair round. The server generates a 256-bit seed,
// stores it hidden, and returns ONLY commit_hash = SHA256(server_seed). The
// operator is now cryptographically bound to that seed.
// =============================================================================

import { adminClient, getUserId, userClientFromRequest } from "../_shared/supabase.ts";
import { handleOptions, json, writeAudit } from "../_shared/http.ts";

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const userId = await getUserId(req);
    if (!userId) return json({ ok: false, error: "Unauthorized" }, 401);

    // rng_commit re-checks auth.uid(), so it must run in the caller's JWT context.
    const userClient = userClientFromRequest(req);
    const { data, error } = await userClient.rpc("rng_commit", { p_user_id: userId });
    if (error) return json({ ok: false, error: error.message }, 400);

    const admin = adminClient();

    await writeAudit(admin, "RNG", userId, req, { stage: "commit", round_id: data?.round_id });
    return json(data);
  } catch (e) {
    return json({ ok: false, error: String(e?.message ?? e) }, 400);
  }
});
