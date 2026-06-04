// =============================================================================
// transfer_poxy — move ownership of a POXY via a signed, validated ledger event.
// Supports event_type TRANSFER (gift) and TRADE (marketplace settlement).
// =============================================================================

import { adminClient, getUserId } from "../_shared/supabase.ts";
import { loadActiveSigningKey, sign } from "../_shared/kms.ts";
import { buildEventCanonical, isoMicro } from "../_shared/canonical.ts";
import { enforceReplayProtection, handleOptions, json, writeAudit } from "../_shared/http.ts";

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const userId = await getUserId(req);
    if (!userId) return json({ ok: false, error: "Unauthorized" }, 401);

    const body = await req.json();
    const { envelope, asset_id, to_owner, event_type = "TRANSFER" } = body ?? {};
    if (!asset_id || !to_owner) return json({ ok: false, error: "asset_id and to_owner required" }, 400);
    if (!["TRANSFER", "TRADE"].includes(event_type)) {
      return json({ ok: false, error: "event_type must be TRANSFER or TRADE" }, 400);
    }
    if (to_owner === userId) return json({ ok: false, error: "Cannot transfer to self" }, 400);

    const admin = adminClient();
    await enforceReplayProtection(admin, userId, { ...envelope, action: "transfer_poxy" });

    const key = await loadActiveSigningKey(admin);
    const nonce = envelope?.nonce ?? crypto.randomUUID();
    const ts = isoMicro();
    const canonical = buildEventCanonical({
      v: 1,
      type: event_type,
      asset_id,
      actor_id: userId,
      ts,
      nonce,
      payload: { from: userId, to: to_owner },
    });
    const eventSignature = sign(canonical, key);

    const { data, error } = await admin.rpc("crypto_transfer_poxy", {
      p_asset_id: asset_id,
      p_from_owner: userId,
      p_to_owner: to_owner,
      p_event_type: event_type,
      p_event_canonical: canonical,
      p_event_signature: eventSignature,
      p_key_version: key.keyVersion,
      p_nonce: nonce,
      p_actor_id: userId,
      p_payload: { from: userId, to: to_owner },
    });

    if (error) return json({ ok: false, error: error.message }, 400);
    if (!data?.ok) {
      await writeAudit(admin, "VERIFY_FAIL", userId, req, { stage: "transfer", detail: data });
      return json(data, 400);
    }

    await writeAudit(admin, event_type, userId, req, { asset_id, to_owner, event_hash: data.event_hash });
    return json(data);
  } catch (e) {
    return json({ ok: false, error: String(e?.message ?? e) }, 400);
  }
});
