// =============================================================================
// transfer_poxy — move ownership of a POXY via a signed, validated ledger event.
// Supports event_type TRANSFER (gift) and TRADE (marketplace settlement).
// =============================================================================

import { adminClient, getUserId } from "../_shared/supabase.ts";
import { loadActiveSigningKey, sign } from "../_shared/kms.ts";
import { buildEventCanonical, isoMicro } from "../_shared/canonical.ts";
import { enforceReplayProtection, handleOptions, json, writeAudit } from "../_shared/http.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { parseValidated, transferPoxySchema } from "../_shared/schemas.ts";

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const userId = await getUserId(req);
    if (!userId) return json({ ok: false, error: "Unauthorized" }, 401);

    const admin = adminClient();
    const limited = await enforceRateLimit(admin, userId, "transfer_poxy", 20);
    if (limited) return limited;

    const parsed = parseValidated(transferPoxySchema, await req.json());
    if (!parsed.ok) return parsed.response;
    const {
      envelope,
      asset_id,
      to_owner,
      event_type = "TRANSFER",
      from_owner: explicitFrom = null,
      offer_id = null,
    } = parsed.data;

    let fromOwner = userId;
    let actorId = userId;

    if (event_type === "TRADE" && explicitFrom) {
      // P2P trade accept: recipient settles; seller is explicit from_owner.
      if (userId !== to_owner) {
        return json({ ok: false, error: "TRADE settlement: caller must be recipient (to_owner)" }, 400);
      }
      if (explicitFrom === to_owner) {
        return json({ ok: false, error: "Invalid trade parties" }, 400);
      }
      fromOwner = explicitFrom;
      actorId = userId;
    } else {
      if (to_owner === userId) return json({ ok: false, error: "Cannot transfer to self" }, 400);
    }

    await enforceReplayProtection(admin, userId, { ...envelope, action: "transfer_poxy" });

    const key = await loadActiveSigningKey(admin);
    const nonce = envelope?.nonce ?? crypto.randomUUID();
    const ts = isoMicro();
    const payload: Record<string, unknown> = { from: fromOwner, to: to_owner };
    if (offer_id) payload.offer_id = offer_id;

    const canonical = buildEventCanonical({
      v: 1,
      type: event_type,
      asset_id,
      actor_id: actorId,
      ts,
      nonce,
      payload,
    });
    const eventSignature = sign(canonical, key);

    const { data, error } = await admin.rpc("crypto_transfer_poxy", {
      p_asset_id: asset_id,
      p_from_owner: fromOwner,
      p_to_owner: to_owner,
      p_event_type: event_type,
      p_event_canonical: canonical,
      p_event_signature: eventSignature,
      p_key_version: key.keyVersion,
      p_nonce: nonce,
      p_actor_id: actorId,
      p_payload: payload,
    });

    if (error) return json({ ok: false, error: error.message }, 400);
    if (!data?.ok) {
      await writeAudit(admin, "VERIFY_FAIL", userId, req, { stage: "transfer", detail: data });
      return json(data, 400);
    }

    await writeAudit(admin, event_type, userId, req, {
      asset_id,
      from_owner: fromOwner,
      to_owner,
      event_hash: data.event_hash,
      offer_id,
    });
    return json(data);
  } catch (e) {
    return json({ ok: false, error: String(e?.message ?? e) }, 400);
  }
});
