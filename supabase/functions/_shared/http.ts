// =============================================================================
// HTTP helpers: CORS, JSON responses, replay-protection envelope verification.
// =============================================================================

import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { sha256Hex } from "./crypto.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return null;
}

/** Best-effort client fingerprint for the audit log. */
export function clientInfo(req: Request) {
  return {
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("cf-connecting-ip") ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
    device: req.headers.get("x-device-id") ?? null,
  };
}

export interface RequestEnvelope {
  nonce: string;
  timestamp: string; // ISO; must be within the freshness window
  action: string;
  [k: string]: unknown;
}

const WINDOW_MS = 120_000; // 2-minute freshness window

/**
 * Replay-attack protection. The client sends a unique nonce + timestamp. We:
 *   - reject stale/future timestamps (expiry window),
 *   - derive a request signature = SHA256(userId|action|nonce|timestamp),
 *   - persist (nonce, signature) via consume_request_nonce which rejects reuse.
 * Throws on any failure.
 */
export async function enforceReplayProtection(
  admin: SupabaseClient,
  userId: string,
  env: RequestEnvelope,
): Promise<void> {
  if (!env?.nonce || !env?.timestamp || !env?.action) {
    throw new Error("REPLAY: missing nonce/timestamp/action");
  }
  const ts = Date.parse(env.timestamp);
  if (Number.isNaN(ts)) throw new Error("REPLAY: invalid timestamp");
  const drift = Math.abs(Date.now() - ts);
  if (drift > WINDOW_MS) throw new Error("REPLAY: request outside freshness window");

  const reqSig = await sha256Hex(`${userId}|${env.action}|${env.nonce}|${env.timestamp}`);

  const { error } = await admin.rpc("consume_request_nonce", {
    p_nonce: env.nonce,
    p_user_id: userId,
    p_action: env.action,
    p_signature: reqSig,
    p_ttl_seconds: 120,
  });
  if (error) throw new Error(`REPLAY_DETECTED: ${error.message}`);
}

/** Fire-and-forget audit log write. */
export async function writeAudit(
  admin: SupabaseClient,
  category: string,
  userId: string | null,
  req: Request,
  detail: Record<string, unknown>,
): Promise<void> {
  const info = clientInfo(req);
  await admin.rpc("audit_log", {
    p_category: category,
    p_user_id: userId,
    p_ip: info.ip,
    p_device: info.device,
    p_user_agent: info.userAgent,
    p_detail: detail,
  });
}
