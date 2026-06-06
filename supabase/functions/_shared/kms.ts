// =============================================================================
// KMS-like signing layer for Edge Functions.
// -----------------------------------------------------------------------------
// Private ED25519 keys live ONLY in Edge Function secrets, named:
//     POXY_SIGNING_SK_V1, POXY_SIGNING_SK_V2, ...        (base64 raw 32-byte sk)
// The matching public keys + lifecycle live in public.crypto_keys.
//
// Separation of duties:
//   - signing keys (private)  : only this module, only inside Edge.
//   - verification keys (public): in the DB, readable by anyone for audit.
//
// Key rotation: activate a new version in crypto_keys (dual-control) and add its
// secret. New signatures use the active version; old signatures stay verifiable
// forever because every signed row records its key_version.
// =============================================================================

import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { publicKeyFromPrivate, signMessage, verifyMessage } from "./crypto.ts";

export interface ActiveKey {
  keyVersion: number;
  privateKeyB64: string;
  publicKeyB64: string;
}

function secretFor(version: number): string {
  const sk = Deno.env.get(`POXY_SIGNING_SK_V${version}`);
  if (!sk) throw new Error(`Missing signing secret POXY_SIGNING_SK_V${version}`);
  return sk;
}

/** Load the currently-active signing key (version from DB, secret from env). */
export async function loadActiveSigningKey(admin: SupabaseClient): Promise<ActiveKey> {
  const { data, error } = await admin
    .from("crypto_keys")
    .select("key_version, public_key, status")
    .eq("purpose", "asset_event_signing")
    .eq("status", "active")
    .single();

  if (error || !data) throw new Error("No active signing key registered in crypto_keys");

  const sk = secretFor(data.key_version);
  // Defensive: the env private key must match the DB-registered public key.
  if (publicKeyFromPrivate(sk) !== data.public_key) {
    throw new Error(`Key mismatch: POXY_SIGNING_SK_V${data.key_version} != registered public key`);
  }
  return { keyVersion: data.key_version, privateKeyB64: sk, publicKeyB64: data.public_key };
}

export function sign(message: string, key: ActiveKey): string {
  return signMessage(message, key.privateKeyB64);
}

/** Verify a signature against the public key registered for a key_version. */
export async function verifyWithVersion(
  admin: SupabaseClient,
  message: string,
  signatureB64: string,
  keyVersion: number,
): Promise<boolean> {
  const { data, error } = await admin
    .from("crypto_keys")
    .select("public_key")
    .eq("key_version", keyVersion)
    .single();
  if (error || !data) return false;
  return verifyMessage(message, signatureB64, data.public_key);
}
