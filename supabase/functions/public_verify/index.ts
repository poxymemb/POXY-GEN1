// =============================================================================
// public_verify — unauthenticated cryptographic transparency endpoint.
// Accepts a poxy_hash, event UUID, or RNG round UUID and returns a
// step-by-step verifiable proof without exposing any server secrets.
// verify_jwt = false  (public transparency layer)
// =============================================================================

import { adminClient } from "../_shared/supabase.ts";
import { verifyMessage } from "../_shared/crypto.ts";

// Public transparency endpoint — reflect any browser origin (verify works logged-out, any account).
function cors(req: Request) {
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors(req) });
  }

  const headers = { ...cors(req), "Content-Type": "application/json" };

  try {
    const body = await req.json();
    const { type, hash } = body ?? {};
    const id = body?.id != null ? String(body.id).replace(/^#/, "").trim() : undefined;

    if (!type) {
      return new Response(
        JSON.stringify({ ok: false, error: "type required: 'asset' | 'event' | 'rng'" }),
        { status: 400, headers },
      );
    }

    const admin = adminClient();

    // ── ASSET VERIFICATION ────────────────────────────────────────────────────
    if (type === "asset") {
      if (!hash) return new Response(JSON.stringify({ ok: false, error: "hash required" }), { status: 400, headers });

      const { data, error } = await admin.rpc("public_verify_asset", { p_hash: hash });
      if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 400, headers });
      if (!data?.ok) return new Response(JSON.stringify(data), { status: 404, headers });

      // Step 3: edge-side ED25519 signature verification
      // signMessage signs the UTF-8 encoding of the hex hash string.
      let signatureValid = false;
      let sigError: string | null = null;
      try {
        signatureValid = verifyMessage(
          data.poxy_hash as string,
          data.signature as string,
          data.public_key as string,
        );
      } catch (e) {
        sigError = String(e?.message ?? e);
      }

      const steps = [
        {
          step: 1,
          name: "Hash Pre-image Construction",
          description: "The POXY identity hash pre-image is constructed deterministically from 7 immutable fields: creator_id, mint_timestamp, serial_number, rarity_seed, collection_id, generation_version, and server_salt. The server_salt is never disclosed; only the resulting hash is published.",
          formula: "SHA256(creator_id | timestamp | serial | rarity_seed | collection | gen_version | server_salt)",
          result: "pre-image assembled",
          ok: true,
        },
        {
          step: 2,
          name: "SHA-256 Identity Hash",
          description: "SHA-256 is applied to the UTF-8 bytes of the pre-image, producing a 256-bit (64 hex character) deterministic fingerprint. The same inputs always produce the same hash — and any input change produces a completely different hash.",
          stored_hash: data.poxy_hash,
          computed_hash: data.computed_hash,
          ok: data.hash_matches,
          result: data.hash_matches ? "MATCH — stored hash equals recomputed hash" : "MISMATCH — possible tampering detected",
        },
        {
          step: 3,
          name: "ED25519 Signature Verification",
          description: "The POXY hash was signed at mint time using the server's ED25519 private key (stored only in Edge Function secrets, never in the database). The signature is verified here using the public key registered on-chain in the crypto_keys table.",
          public_key: data.public_key,
          key_version: data.key_version,
          signature: data.signature,
          ok: signatureValid,
          result: signatureValid
            ? "VALID — signature verified against registered public key"
            : `INVALID — ${sigError ?? "signature does not match public key"}`,
        },
        {
          step: 4,
          name: "Genesis Event Anchor",
          description: "Every legitimate POXY has exactly one MINT event in the append-only ledger. The genesis event hash is chained to its predecessor, making the ledger tamper-evident. An asset without a genesis event was never legitimately minted.",
          genesis_event_id: data.genesis_event_id,
          genesis_event_hash: data.genesis_event_hash,
          genesis_event_type: data.genesis_event_type,
          ok: Boolean(data.genesis_event_id && data.genesis_event_type === "MINT"),
          result: data.genesis_event_id ? "CONFIRMED — genesis MINT event exists in ledger" : "MISSING — no genesis event found",
        },
      ];

      const serialAligned = data.serial_matches !== false;
      const allOk = Boolean(data.hash_matches && signatureValid && data.genesis_event_id && serialAligned);

      return new Response(
        JSON.stringify({
          ok: allOk,
          type: "asset",
          asset_id: data.asset_id,
          poxy_hash: data.poxy_hash,
          poxy_tier: data.poxy_tier,
          collection_id: data.collection_id,
          serial_number: data.serial_number,
          game_serial: data.game_serial,
          serial_matches: data.serial_matches,
          rng_round_id: data.rng_round_id,
          genesis_event_id: data.genesis_event_id,
          generation_version: data.generation_version,
          asset_state: data.asset_state,
          mint_timestamp: data.mint_ts_canonical,
          summary: allOk
            ? "FULLY VERIFIED — this POXY is authentic, unmodified, and cryptographically signed."
            : serialAligned
              ? "VERIFICATION FAILED — one or more integrity checks did not pass."
              : "IDENTITY MISMATCH — game serial and crypto serial differ (re-mint required).",
          steps,
        }),
        { status: 200, headers },
      );
    }

    // ── EVENT VERIFICATION ────────────────────────────────────────────────────
    if (type === "event") {
      if (!id) return new Response(JSON.stringify({ ok: false, error: "id required" }), { status: 400, headers });

      const { data, error } = await admin.rpc("public_verify_event", { p_event_id: id });
      if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 400, headers });
      if (!data?.ok) return new Response(JSON.stringify(data), { status: 404, headers });

      const steps = [
        {
          step: 1,
          name: "Event Canonical Body",
          description: "Every ledger event has a canonical JSON body — a deterministic, sorted serialization of the event payload. This canonical form is used as the pre-image for the event hash, ensuring no two events have identical hashes.",
          canonical: data.canonical,
          ok: true,
          result: "canonical body retrieved",
        },
        {
          step: 2,
          name: "SHA-256 Hash Chain Verification",
          description: "Each event's hash is computed as SHA256(prev_event_hash + newline + canonical_body). This chains every event to its predecessor, making the ledger tamper-evident: altering any event breaks all subsequent hashes.",
          formula: "SHA256(prev_event_hash || '\\n' || canonical_body)",
          prev_event_hash: data.prev_event_hash,
          stored_hash: data.event_hash,
          computed_hash: data.computed_hash,
          ok: data.hash_matches,
          result: data.hash_matches ? "MATCH — event is part of the valid chain" : "MISMATCH — chain integrity broken",
        },
        {
          step: 3,
          name: "Predecessor Event Link",
          description: "The prev_event_hash field links this event to its predecessor. Tracing these links back to the genesis event reconstructs the entire history of any asset.",
          prev_event_id: data.prev_event_id,
          prev_event_hash: data.prev_event_hash,
          ok: true,
          result: data.prev_event_id ? `linked to event ${data.prev_event_id}` : "genesis event (no predecessor)",
        },
      ];

      return new Response(
        JSON.stringify({
          ok: data.hash_matches,
          type: "event",
          event_id: data.event_id,
          event_type: data.event_type,
          event_hash: data.event_hash,
          seq: data.seq,
          created_at: data.created_at,
          poxy_hash: data.poxy_hash,
          game_serial: data.game_serial,
          rng_round_id: data.rng_round_id,
          genesis_event_id: data.event_id,
          summary: data.hash_matches
            ? "EVENT VERIFIED — this ledger entry is part of the valid hash chain."
            : "EVENT INVALID — hash chain broken at this event.",
          steps,
        }),
        { status: 200, headers },
      );
    }

    // ── RNG VERIFICATION ──────────────────────────────────────────────────────
    if (type === "rng") {
      if (!id) return new Response(JSON.stringify({ ok: false, error: "id required" }), { status: 400, headers });

      const { data, error } = await admin.rpc("public_verify_rng", { p_round_id: id });
      if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 400, headers });
      if (!data?.ok) return new Response(JSON.stringify(data), { status: 404, headers });

      if (data.status === "pending") {
        return new Response(
          JSON.stringify({
            ok: true,
            type: "rng",
            status: "pending",
            round_id: id,
            commit_hash: data.commit_hash,
            summary: "Round not yet revealed. The server seed is hidden behind the commit hash. Come back after the round is revealed to verify fairness.",
            steps: [
              {
                step: 1,
                name: "Commit Phase",
                description: "Before the round began, the server computed a random server_seed and published commit_hash = SHA256(server_seed). The server cannot change the seed without changing this hash.",
                commit_hash: data.commit_hash,
                ok: true,
                result: "commit published — server seed locked in",
              },
              {
                step: 2,
                name: "Reveal Phase",
                description: "Waiting for reveal. Once the server reveals the server_seed, you can independently verify: SHA256(server_seed) = commit_hash.",
                ok: null,
                result: "pending",
              },
            ],
          }),
          { status: 200, headers },
        );
      }

      const steps = [
        {
          step: 1,
          name: "Commit Verification",
          description: "Before the round started, the server published commit_hash = SHA256(server_seed). We now recompute SHA256(revealed_server_seed) and compare it to the original commit. A match proves the server couldn't have changed the seed after publishing the commit.",
          formula: "SHA256(server_seed) == commit_hash",
          recomputed_commit: data.recomputed_commit,
          stored_commit: data.commit_hash,
          ok: data.commit_matches,
          result: data.commit_matches ? "MATCH — server honoured its commitment" : "MISMATCH — server seed was changed after commit (fraud detected)",
        },
        {
          step: 2,
          name: "Result Derivation",
          description: "The final result is SHA256(server_seed + client_seed + nonce). The client_seed was chosen by the user after the commit was published, so neither party can manipulate the final output.",
          formula: "SHA256(server_seed || client_seed || nonce)",
          server_seed: data.server_seed,
          client_seed: data.client_seed,
          nonce: data.nonce,
          computed_result: data.computed_result,
          stored_result: data.result_hash,
          ok: data.result_matches,
          result: data.result_matches ? "MATCH — result is deterministically derived and cannot be manipulated" : "MISMATCH — result was modified",
        },
        {
          step: 3,
          name: "Fairness Guarantee",
          description: "Since the commit was published before the client seed was submitted, and the result depends on both seeds, neither the server nor the client alone could have predicted or manipulated the outcome.",
          ok: data.commit_matches && data.result_matches,
          result: (data.commit_matches && data.result_matches) ? "PROVABLY FAIR — neither party could manipulate the outcome" : "FAIRNESS BROKEN",
        },
      ];

      return new Response(
        JSON.stringify({
          ok: data.commit_matches && data.result_matches,
          type: "rng",
          status: "revealed",
          round_id: id,
          commit_hash: data.commit_hash,
          result_hash: data.result_hash,
          poxy_hash: data.poxy_hash,
          game_serial: data.game_serial,
          poxy_tier: data.poxy_tier,
          genesis_event_id: data.genesis_event_id,
          asset_id: data.asset_id,
          rng_round_id: id,
          summary: (data.commit_matches && data.result_matches)
            ? "PROVABLY FAIR — the RNG result is cryptographically verifiable and manipulation-proof."
            : "INTEGRITY FAILURE — one or more RNG checks failed.",
          steps,
        }),
        { status: 200, headers },
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: "type must be 'asset', 'event', or 'rng'" }),
      { status: 400, headers },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message ?? e) }),
      { status: 400, headers },
    );
  }
});
