// =============================================================================
// export_proof — produce a self-contained, independently-verifiable proof packet
// for a single POXY. The packet can be checked OFFLINE (no DB access) with
// tools/verify-proof-packet.mjs.
//
// proof_packet = {
//   poxy_hash, signature, key_version, public_key,
//   identity { creator_id, mint_timestamp, serial_number, rarity_seed,
//              collection_id, generation_version, server_salt },  // re-derive hash
//   creation_event_chain [ ...events for this asset, ordered ],
//   ownership_history [ ...TRANSFER/TRADE events ],
//   merkle_proof { tree:'events', leaf, proof[], root },
//   event_root_hash,
//   snapshot { state_root, created_at } | null
// }
// =============================================================================

import { adminClient, getUserId, userClientFromRequest } from "../_shared/supabase.ts";
import { merkleProof, merkleRoot } from "../_shared/crypto.ts";
import { handleOptions, json } from "../_shared/http.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { assetIdSchema, parseValidated } from "../_shared/schemas.ts";

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const userId = await getUserId(req);
    if (!userId) return json({ ok: false, error: "Unauthorized" }, 401);

    const admin = adminClient();
    const limited = await enforceRateLimit(admin, userId, "export_proof", 10);
    if (limited) return limited;

    const parsed = parseValidated(assetIdSchema, await req.json());
    if (!parsed.ok) return parsed.response;
    const { asset_id } = parsed.data;

    const { data: asset, error: aErr } = await admin
      .from("poxy_assets").select("*").eq("id", asset_id).single();
    if (aErr || !asset) return json({ ok: false, error: "Asset not found" }, 404);

    // Authorization: owner, creator, or founder only.
    // IMPORTANT: must use userClient (JWT context) so auth.uid() resolves correctly
    // inside is_founder(). adminClient (service_role) has no auth.uid().
    const userClient = userClientFromRequest(req);
    const { data: founder } = await userClient.rpc("is_founder");
    if (asset.current_owner_id !== userId && asset.creator_id !== userId && !founder) {
      return json({ ok: false, error: "Not authorized to export this proof" }, 403);
    }

    const { data: pubKey } = await admin
      .from("crypto_keys").select("public_key").eq("key_version", asset.key_version).single();

    // Events for this asset (creation chain + ownership history).
    const { data: assetEvents } = await admin
      .from("ledger_events")
      .select("seq, event_type, event_hash, prev_event_hash, canonical, signature, key_version, event_timestamp, payload")
      .eq("asset_id", asset_id).order("seq", { ascending: true });

    const genesis = (assetEvents ?? []).find((e) => e.event_type === "MINT");
    const ownership = (assetEvents ?? []).filter((e) => ["TRANSFER", "TRADE"].includes(e.event_type));

    // Merkle inclusion proof for the genesis event in the global events tree.
    // NOTE: Fetches all event hashes — O(n) as the ledger grows. This is acceptable
    // for early launch but should be replaced with a pre-computed Merkle root stored
    // in state_snapshots once the ledger exceeds ~10k events.
    const { data: allEvents } = await admin
      .from("ledger_events")
      .select("event_hash")
      .order("seq", { ascending: true })
      .limit(50_000); // safety cap: prevents OOM on very large ledgers
    const leaves = (allEvents ?? []).map((r: { event_hash: string }) => r.event_hash);
    const eventRoot = await merkleRoot(leaves);

    let merkle = null;
    if (genesis) {
      const idx = leaves.indexOf(genesis.event_hash);
      if (idx !== -1) {
        const p = await merkleProof(leaves, idx);
        merkle = { tree: "events", leaf: genesis.event_hash, proof: p.proof, root: p.root };
      }
    }

    const { data: snap } = await admin
      .from("state_snapshots").select("state_root, asset_root, event_root, created_at, max_event_seq")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    const packet = {
      version: 1,
      generated_at: new Date().toISOString(),
      poxy_hash: asset.poxy_hash,
      signature: asset.signature,
      key_version: asset.key_version,
      public_key: pubKey?.public_key ?? null,
      identity: {
        creator_id: asset.creator_id,
        // hash_timestamp is the EXACT string hashed; use it for re-derivation.
        hash_timestamp: asset.mint_ts_canonical,
        mint_timestamp: asset.mint_timestamp,
        serial_number: asset.serial_number,
        rarity_seed: asset.rarity_seed,
        collection_id: asset.collection_id,
        generation_version: asset.generation_version,
        server_salt: asset.server_salt,
      },
      current_owner_id: asset.current_owner_id,
      asset_state: asset.asset_state,
      creation_event_chain: assetEvents ?? [],
      ownership_history: ownership,
      merkle_proof: merkle,
      event_root_hash: eventRoot,
      snapshot: snap ?? null,
    };

    return json({ ok: true, proof_packet: packet });
  } catch (e) {
    return json({ ok: false, error: String(e?.message ?? e) }, 400);
  }
});
