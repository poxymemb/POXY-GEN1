// =============================================================================
// POXY Cryptographic Service Layer (Deno / Edge runtime)
// -----------------------------------------------------------------------------
// Primitives shared by every Edge Function. All hashing is byte-identical to the
// PostgreSQL implementation (UTF-8 bytes -> SHA-256 -> lowercase hex), so any
// value produced here can be re-verified in SQL and vice-versa.
//
//   SHA-256  : Web Crypto (built into Deno)
//   ED25519  : @noble/ed25519 (audited, dependency-light)
//   Merkle   : root + inclusion proof + verification (pairwise SHA-256)
// =============================================================================

import * as ed from "https://esm.sh/@noble/ed25519@2.1.0";
import { sha512 } from "https://esm.sh/@noble/hashes@1.4.0/sha512";

// @noble/ed25519 v2 needs a sync SHA-512 hook for the sync sign/verify API.
ed.etc.sha512Sync = (...m: Uint8Array[]) => sha512(ed.etc.concatBytes(...m));

const enc = new TextEncoder();

// ---------- hex / base64 helpers --------------------------------------------

export function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export function fromHex(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

export function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---------- SHA-256 ----------------------------------------------------------

/** SHA-256 over the UTF-8 bytes of `input`, returned as lowercase hex. */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return toHex(new Uint8Array(digest));
}

/** SHA-256 over raw bytes -> hex. */
export async function sha256HexBytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return toHex(new Uint8Array(digest));
}

// ---------- ED25519 ----------------------------------------------------------

export function generateKeypair(): { privateKeyB64: string; publicKeyB64: string } {
  const sk = ed.utils.randomPrivateKey();
  const pk = ed.getPublicKey(sk);
  return { privateKeyB64: toBase64(sk), publicKeyB64: toBase64(pk) };
}

export function publicKeyFromPrivate(privateKeyB64: string): string {
  return toBase64(ed.getPublicKey(fromBase64(privateKeyB64)));
}

/** Sign a UTF-8 message with a base64 ED25519 private key. Returns base64 sig. */
export function signMessage(message: string, privateKeyB64: string): string {
  const sig = ed.sign(enc.encode(message), fromBase64(privateKeyB64));
  return toBase64(sig);
}

/** Verify a base64 signature over a UTF-8 message with a base64 public key. */
export function verifyMessage(message: string, signatureB64: string, publicKeyB64: string): boolean {
  try {
    return ed.verify(fromBase64(signatureB64), enc.encode(message), fromBase64(publicKeyB64));
  } catch {
    return false;
  }
}

// ---------- Merkle tree (pairwise SHA-256 over hex leaves) -------------------
// Matches public.crypto_merkle_root() in SQL: parent = SHA256(leftHex || rightHex),
// odd trailing node duplicated, empty tree => 64 zeros.

export const ZERO_HASH = "0".repeat(64);

export async function merkleRoot(leaves: string[]): Promise<string> {
  if (!leaves.length) return ZERO_HASH;
  let level = [...leaves];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left;
      next.push(await sha256Hex(left + right));
    }
    level = next;
  }
  return level[0];
}

export interface MerkleProofStep {
  sibling: string;
  position: "left" | "right"; // position of the SIBLING relative to the running node
}

/** Build an inclusion proof for the leaf at `index`. */
export async function merkleProof(
  leaves: string[],
  index: number,
): Promise<{ root: string; leaf: string; proof: MerkleProofStep[] }> {
  if (index < 0 || index >= leaves.length) throw new Error("leaf index out of range");
  const leaf = leaves[index];
  const proof: MerkleProofStep[] = [];
  let level = [...leaves];
  let idx = index;

  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left;
      if (i === idx || i + 1 === idx) {
        if (idx % 2 === 0) {
          proof.push({ sibling: right, position: "right" });
        } else {
          proof.push({ sibling: left, position: "left" });
        }
      }
      next.push(await sha256Hex(left + right));
    }
    idx = Math.floor(idx / 2);
    level = next;
  }
  return { root: level[0], leaf, proof };
}

/** Verify an inclusion proof recomputes the expected root. */
export async function verifyMerkleProof(
  leaf: string,
  proof: MerkleProofStep[],
  expectedRoot: string,
): Promise<boolean> {
  let node = leaf;
  for (const step of proof) {
    node = step.position === "right"
      ? await sha256Hex(node + step.sibling)
      : await sha256Hex(step.sibling + node);
  }
  return node === expectedRoot;
}
