// =============================================================================
// Canonical serialization — deterministic byte-strings for hashing & signing.
// -----------------------------------------------------------------------------
// Both the signer (Edge) and any external verifier MUST agree on these exact
// strings. Keep this file in sync with the standalone verifier in
// tools/verify-proof-packet.mjs.
// =============================================================================

/** Recursively key-sorted JSON. No insignificant whitespace. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") + "}";
}

/** ISO-8601 with microsecond precision + trailing Z (matches Postgres to_char US). */
export function isoMicro(date: Date = new Date()): string {
  // toISOString() => 2026-06-04T20:23:00.123Z ; widen ms -> us by zero-padding.
  return date.toISOString().replace(/\.(\d{3})Z$/, ".$1000Z");
}

/**
 * The POXY identity hash pre-image (joined with '|'), identical to
 * public.crypto_poxy_hash() in SQL.
 */
export function poxyHashInput(p: {
  creatorId: string;
  timestamp: string; // use isoMicro()
  serialNumber: string;
  raritySeed: string;
  collectionId: string;
  generationVersion: number | string;
  serverSalt: string;
}): string {
  return [
    p.creatorId,
    p.timestamp,
    p.serialNumber,
    p.raritySeed,
    p.collectionId,
    String(p.generationVersion),
    p.serverSalt,
  ].join("|");
}

export interface EventBody {
  v: 1;
  type: "MINT" | "TRANSFER" | "TRADE" | "UPGRADE" | "FUSION" | "DESTROY" | "ADMIN_ACTION";
  asset_id: string | null;
  actor_id: string | null;
  ts: string; // isoMicro
  nonce: string;
  payload: Record<string, unknown>;
}

/** Canonical signed string for a ledger event. */
export function buildEventCanonical(body: EventBody): string {
  return stableStringify(body);
}
