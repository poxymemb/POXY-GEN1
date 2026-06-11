// =============================================================================
// verify_poxy — full integrity check of one asset:
//   - SQL recomputes the SHA-256 identity hash and confirms a genesis event.
//   - Edge re-verifies the ED25519 signature against the registered public key.
// =============================================================================

import { adminClient, getUserId } from "../_shared/supabase.ts";
import { verifyWithVersion } from "../_shared/kms.ts";
import { handleOptions, json, safeErrorResponse, writeAudit } from "../_shared/http.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { assetIdSchema, parseValidated } from "../_shared/schemas.ts";

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const userId = await getUserId(req);
    if (!userId) return json({ ok: false, error: "Unauthorized" }, 401);

    const admin = adminClient();
    const limited = await enforceRateLimit(admin, userId, "verify_poxy", 60);
    if (limited) return limited;

    const parsed = parseValidated(assetIdSchema, await req.json());
    if (!parsed.ok) return parsed.response;
    const { asset_id } = parsed.data;

    // 1. structural + hash integrity (SQL side)
    const { data: integrity, error } = await admin.rpc("verify_asset_integrity", { p_asset_id: asset_id });
    if (error) return json({ ok: false, error: error.message }, 400);
    if (!integrity?.asset_id) return json({ ok: false, error: "Asset not found" }, 404);

    // 2. cryptographic signature verification (Edge side)
    const signatureValid = await verifyWithVersion(
      admin,
      integrity.stored_hash,
      integrity.signature,
      integrity.key_version,
    );

    const ok = Boolean(integrity.hash_matches && integrity.has_genesis_event && signatureValid);
    if (!ok) await writeAudit(admin, "VERIFY_FAIL", userId, req, { asset_id, integrity, signatureValid });

    return json({
      ok,
      asset_id,
      hash_matches: integrity.hash_matches,
      has_genesis_event: integrity.has_genesis_event,
      signature_valid: signatureValid,
      state: integrity.state,
      poxy_hash: integrity.stored_hash,
      key_version: integrity.key_version,
    });
  } catch (e) {
    return safeErrorResponse(e, "verify_poxy", 400, "Invalid request");
  }
});
