// =============================================================================
// rng_reveal — reveal the server seed, bind client_seed + nonce, and publish the
// reproducible result = SHA256(server_seed || client_seed || nonce).
// Anyone can now confirm SHA256(server_seed) == commit_hash and recompute result.
// =============================================================================

import { adminClient, getUserId, userClientFromRequest } from "../_shared/supabase.ts";
import { handleOptions, json, safeErrorResponse, writeAudit } from "../_shared/http.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { parseValidated, rngRevealSchema } from "../_shared/schemas.ts";

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const userId = await getUserId(req);
    if (!userId) return json({ ok: false, error: "Unauthorized" }, 401);

    const admin = adminClient();
    const limited = await enforceRateLimit(admin, userId, "rng_reveal", 30);
    if (limited) return limited;

    const parsed = parseValidated(rngRevealSchema, await req.json());
    if (!parsed.ok) return parsed.response;
    const { round_id, client_seed, nonce } = parsed.data;

    const userClient = userClientFromRequest(req);
    const { data, error } = await userClient.rpc("rng_reveal", {
      p_round_id: round_id,
      p_client_seed: String(client_seed),
      p_nonce: nonce,
    });
    if (error) return json({ ok: false, error: error.message }, 400);

    await writeAudit(admin, "RNG", userId, req, { stage: "reveal", round_id, result: data?.result });
    return json(data);
  } catch (e) {
    return safeErrorResponse(e, "rng_reveal", 400, "Invalid request");
  }
});
