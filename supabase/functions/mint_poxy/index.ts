// =============================================================================
// mint_poxy — register a new cryptographic POXY.
//   1. authenticate caller          5. ED25519-sign the poxy_hash
//   2. replay protection            6. build + sign the MINT event
//   3. allocate identity material   7. atomic crypto_mint_poxy RPC
//   4. compute SHA-256 poxy_hash    8. audit + return proof stub
// =============================================================================

import { adminClient, getUserId } from "../_shared/supabase.ts";
import { loadActiveSigningKey, sign } from "../_shared/kms.ts";
import { sha256Hex } from "../_shared/crypto.ts";
import { buildEventCanonical, isoMicro, poxyHashInput } from "../_shared/canonical.ts";
import { enforceReplayProtection, handleOptions, json, writeAudit } from "../_shared/http.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { mintPoxySchema, parseValidated } from "../_shared/schemas.ts";

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const userId = await getUserId(req);
    if (!userId) return json({ ok: false, error: "Unauthorized" }, 401);

    const admin = adminClient();
    const limited = await enforceRateLimit(admin, userId, "mint_poxy", 10);
    if (limited) return limited;

    const parsed = parseValidated(mintPoxySchema, await req.json());
    if (!parsed.ok) return parsed.response;
    const {
      envelope,
      tier,
      collection_id,
      generation_version,
      link_user_poxy_id = null,
      rarity_seed: providedSeed,
      serial_number: providedSerial,
    } = parsed.data;

    await enforceReplayProtection(admin, userId, { ...envelope, action: "mint_poxy" });

    const key = await loadActiveSigningKey(admin);

    // --- identity material (server-controlled, never client-trusted) ----------
    const timestamp = isoMicro();
    const serialNumber = providedSerial ?? `PX-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
    const raritySeed = providedSeed ?? crypto.randomUUID();
    const serverSalt = crypto.randomUUID() + crypto.randomUUID();

    const hashInput = poxyHashInput({
      creatorId: userId,
      timestamp,
      serialNumber,
      raritySeed,
      collectionId: collection_id,
      generationVersion: generation_version,
      serverSalt,
    });
    const poxyHash = await sha256Hex(hashInput);

    // --- signatures -----------------------------------------------------------
    const assetSignature = sign(poxyHash, key);
    const nonce = envelope?.nonce ?? crypto.randomUUID();
    const canonical = buildEventCanonical({
      v: 1,
      type: "MINT",
      asset_id: null,
      actor_id: userId,
      ts: timestamp,
      nonce,
      payload: { poxy_hash: poxyHash, tier, collection_id },
    });
    const eventSignature = sign(canonical, key);

    // --- atomic ledger write --------------------------------------------------
    const { data, error } = await admin.rpc("crypto_mint_poxy", {
      p_owner_id: userId,
      p_creator_id: userId,
      p_serial_number: serialNumber,
      p_rarity_seed: raritySeed,
      p_collection_id: collection_id,
      p_generation_version: generation_version,
      p_server_salt: serverSalt,
      p_poxy_tier: tier,
      p_mint_timestamp: timestamp,
      p_signature: assetSignature,
      p_key_version: key.keyVersion,
      p_event_canonical: canonical,
      p_event_signature: eventSignature,
      p_nonce: nonce,
      p_link_user_poxy_id: link_user_poxy_id,
      p_payload: { tier, collection_id },
    });

    if (error) return json({ ok: false, error: error.message }, 400);
    if (!data?.ok) {
      await writeAudit(admin, "VERIFY_FAIL", userId, req, { stage: "mint", detail: data });
      return json(data, 400);
    }

    await writeAudit(admin, "MINT", userId, req, { asset_id: data.asset_id, poxy_hash: data.poxy_hash });

    return json({
      ok: true,
      asset_id: data.asset_id,
      poxy_hash: data.poxy_hash,
      signature: assetSignature,
      key_version: key.keyVersion,
      public_key: key.publicKeyB64,
      event_hash: data.event_hash,
      seq: data.seq,
      identity: { serial_number: serialNumber, rarity_seed: raritySeed, collection_id, generation_version, mint_timestamp: timestamp },
    });
  } catch (e) {
    return json({ ok: false, error: String(e?.message ?? e) }, 400);
  }
});
