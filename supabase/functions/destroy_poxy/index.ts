// =============================================================================
// destroy_poxy — signed DESTROY ledger event when a POXY is burned.
// Gameplay payout still runs via burn_poxy_pc / burn_poxy_bulk_pc (SQL).
// =============================================================================

import { adminClient, getUserId } from "../_shared/supabase.ts";
import { loadActiveSigningKey, sign } from "../_shared/kms.ts";
import { buildEventCanonical, isoMicro } from "../_shared/canonical.ts";
import { enforceReplayProtection, handleOptions, json, safeErrorResponse, writeAudit } from "../_shared/http.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { destroyPoxySchema, parseValidated } from "../_shared/schemas.ts";

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const userId = await getUserId(req);
    if (!userId) return json({ ok: false, error: "Unauthorized" }, 401);

    const admin = adminClient();
    const limited = await enforceRateLimit(admin, userId, "destroy_poxy", 15);
    if (limited) return limited;

    const parsed = parseValidated(destroyPoxySchema, await req.json());
    if (!parsed.ok) return parsed.response;
    const { envelope, asset_id, reason = "burn", user_poxy_id = null, tier = null } = parsed.data;

    await enforceReplayProtection(admin, userId, { ...envelope, action: "destroy_poxy" });

    const key = await loadActiveSigningKey(admin);
    const nonce = envelope?.nonce ?? crypto.randomUUID();
    const ts = isoMicro();
    const payload: Record<string, unknown> = { reason };
    if (user_poxy_id) payload.user_poxy_id = user_poxy_id;
    if (tier) payload.tier = tier;

    const canonical = buildEventCanonical({
      v: 1,
      type: "DESTROY",
      asset_id,
      actor_id: userId,
      ts,
      nonce,
      payload,
    });
    const eventSignature = sign(canonical, key);

    const { data, error } = await admin.rpc("crypto_destroy_poxy", {
      p_asset_id: asset_id,
      p_owner_id: userId,
      p_event_canonical: canonical,
      p_event_signature: eventSignature,
      p_key_version: key.keyVersion,
      p_nonce: nonce,
      p_payload: payload,
    });

    if (error) return json({ ok: false, error: error.message }, 400);
    if (!data?.ok) {
      await writeAudit(admin, "VERIFY_FAIL", userId, req, { stage: "destroy", detail: data });
      return json(data, 400);
    }

    await writeAudit(admin, "DESTROY", userId, req, {
      asset_id,
      event_hash: data.event_hash,
      user_poxy_id,
    });
    return json({ ok: true, ...data, asset_id });
  } catch (e) {
    return safeErrorResponse(e, "destroy_poxy", 400, "Invalid request");
  }
});
