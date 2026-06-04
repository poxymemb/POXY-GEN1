// =============================================================================
// rng_reveal — reveal the server seed, bind client_seed + nonce, and publish the
// reproducible result = SHA256(server_seed || client_seed || nonce).
// Anyone can now confirm SHA256(server_seed) == commit_hash and recompute result.
// =============================================================================

import { adminClient, getUserId, userClientFromRequest } from "../_shared/supabase.ts";
import { handleOptions, json, writeAudit } from "../_shared/http.ts";

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const userId = await getUserId(req);
    if (!userId) return json({ ok: false, error: "Unauthorized" }, 401);

    const { round_id, client_seed, nonce = 0 } = (await req.json()) ?? {};
    if (!round_id || client_seed == null) {
      return json({ ok: false, error: "round_id and client_seed required" }, 400);
    }

    const userClient = userClientFromRequest(req);
    const { data, error } = await userClient.rpc("rng_reveal", {
      p_round_id: round_id,
      p_client_seed: String(client_seed),
      p_nonce: nonce,
    });
    if (error) return json({ ok: false, error: error.message }, 400);

    const admin = adminClient();
    await writeAudit(admin, "RNG", userId, req, { stage: "reveal", round_id, result: data?.result });
    return json(data);
  } catch (e) {
    return json({ ok: false, error: String(e?.message ?? e) }, 400);
  }
});
