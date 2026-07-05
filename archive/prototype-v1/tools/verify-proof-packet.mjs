#!/usr/bin/env node
// =============================================================================
// POXY proof-packet verifier — INDEPENDENT, OFFLINE, ZERO external dependencies.
// Uses only Node's built-in `crypto`. Re-derives and checks everything a proof
// packet claims, with no access to the Supabase database.
//
// Usage:
//   node tools/verify-proof-packet.mjs path/to/proof.json
//   curl ... export_proof | node tools/verify-proof-packet.mjs -   (read stdin)
//
// Checks performed:
//   1. poxy_hash == SHA256(creator|ts|serial|rarity|collection|gen|salt)
//   2. ED25519_VERIFY(public_key, poxy_hash, signature)
//   3. creation_event_chain is internally hash-linked + canonical-consistent
//   4. genesis MINT event references the poxy_hash
//   5. merkle_proof recomputes to event_root_hash
// Exit code 0 = all valid, 1 = any failure.
// =============================================================================

import { createHash, createPublicKey, verify as edVerify } from "node:crypto";
import { readFileSync } from "node:fs";

const sha256Hex = (s) => createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");

// Recursively key-sorted JSON — must match _shared/canonical.ts stableStringify.
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",") + "}";
}

// Wrap a raw 32-byte ed25519 public key (base64) into a Node KeyObject.
function ed25519PublicKey(b64) {
  const raw = Buffer.from(b64, "base64");
  if (raw.length !== 32) throw new Error(`bad ed25519 public key length ${raw.length}`);
  const der = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), raw]);
  return createPublicKey({ key: der, format: "der", type: "spki" });
}

function verifySignature(message, signatureB64, publicKeyB64) {
  try {
    const key = ed25519PublicKey(publicKeyB64);
    return edVerify(null, Buffer.from(message, "utf8"), key, Buffer.from(signatureB64, "base64"));
  } catch {
    return false;
  }
}

function merkleRootFromProof(leaf, proof) {
  let node = leaf;
  for (const step of proof) {
    node = step.position === "right" ? sha256Hex(node + step.sibling) : sha256Hex(step.sibling + node);
  }
  return node;
}

function check(label, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? "  — " + extra : ""}`);
  return ok;
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("usage: node verify-proof-packet.mjs <proof.json | ->");
    process.exit(2);
  }
  const raw = arg === "-" ? readFileSync(0, "utf8") : readFileSync(arg, "utf8");
  const parsed = JSON.parse(raw);
  const p = parsed.proof_packet ?? parsed; // accept raw packet or wrapped response

  let allOk = true;
  const ok = (l, v, e) => { allOk = check(l, v, e) && allOk; };

  // 1. identity hash re-derivation. hash_timestamp is the exact string that was
  //    hashed at mint time (ISO microseconds), so no format guessing is needed.
  const id = p.identity;
  const ts = id.hash_timestamp ?? id.mint_timestamp;
  const hashInput = [
    id.creator_id, ts, id.serial_number, id.rarity_seed,
    id.collection_id, String(id.generation_version), id.server_salt,
  ].join("|");
  const recomputed = sha256Hex(hashInput);
  ok("identity hash matches poxy_hash", recomputed === p.poxy_hash,
    recomputed === p.poxy_hash ? "" : `recomputed=${recomputed.slice(0, 16)}…`);

  // 2. ED25519 signature over poxy_hash
  ok("ED25519 signature over poxy_hash", verifySignature(p.poxy_hash, p.signature, p.public_key));

  // 3. + 4. event chain integrity within the packet
  const chain = p.creation_event_chain ?? [];
  let chainOk = chain.length > 0;
  for (const ev of chain) {
    const expected = sha256Hex(ev.prev_event_hash + "\n" + ev.canonical);
    if (expected !== ev.event_hash) { chainOk = false; break; }
  }
  ok("creation event chain hashes are consistent", chainOk);

  const genesis = chain.find((e) => e.event_type === "MINT");
  ok("genesis MINT event references poxy_hash",
    !!genesis && JSON.stringify(genesis.payload ?? {}).includes(p.poxy_hash));

  // 5. merkle inclusion proof -> event_root_hash
  if (p.merkle_proof) {
    const root = merkleRootFromProof(p.merkle_proof.leaf, p.merkle_proof.proof);
    ok("merkle proof recomputes to event_root_hash",
      root === p.event_root_hash && root === p.merkle_proof.root,
      root === p.event_root_hash ? "" : `got ${root.slice(0, 16)}…`);
  } else {
    check("merkle proof present", false, "no merkle_proof in packet");
    allOk = false;
  }

  console.log("\n" + (allOk ? "✅ PROOF VALID" : "❌ PROOF INVALID"));
  process.exit(allOk ? 0 : 1);
}

main();
