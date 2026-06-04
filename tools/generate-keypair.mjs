#!/usr/bin/env node
// =============================================================================
// Generate an ED25519 keypair for the POXY signing KMS.
//   - PRIVATE key  -> store as an Edge Function secret  POXY_SIGNING_SK_V<n>
//   - PUBLIC  key  -> insert into public.crypto_keys (printed SQL below)
// Raw 32-byte keys, base64-encoded, compatible with @noble/ed25519 (Edge) and
// the offline verifier in verify-proof-packet.mjs.
//
// Usage: node tools/generate-keypair.mjs [keyVersion]
// =============================================================================

import { generateKeyPairSync } from "node:crypto";

const version = Number(process.argv[2] ?? 1);

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
// pkcs8 DER ends with the 32-byte seed; spki DER ends with the 32-byte pubkey.
const skSeed = privateKey.export({ format: "der", type: "pkcs8" }).subarray(-32);
const pkRaw = publicKey.export({ format: "der", type: "spki" }).subarray(-32);

const skB64 = Buffer.from(skSeed).toString("base64");
const pkB64 = Buffer.from(pkRaw).toString("base64");

console.log("=== POXY ED25519 keypair (version " + version + ") ===\n");
console.log("Private key (SECRET — never commit, set as Edge secret):");
console.log("  POXY_SIGNING_SK_V" + version + "=" + skB64 + "\n");
console.log("Set it with the Supabase CLI:");
console.log("  supabase secrets set POXY_SIGNING_SK_V" + version + "=" + skB64 + "\n");
console.log("Public key (safe to publish):");
console.log("  " + pkB64 + "\n");
console.log("Register + activate it in the DB (dual-control: two distinct admins):");
console.log(`
insert into public.crypto_keys (key_version, public_key, purpose, status, proposed_by)
values (${version}, '${pkB64}', 'asset_event_signing', 'pending', '<proposer-uuid>');

-- After a second admin approves, activate (requires two distinct approvers):
update public.crypto_keys
set status = 'active',
    approved_by_1 = '<admin1-uuid>',
    approved_by_2 = '<admin2-uuid>',
    activated_at = now()
where key_version = ${version};
`);
