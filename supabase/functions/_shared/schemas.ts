// =============================================================================
// Zod input validation schemas for Edge Functions.
// =============================================================================

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { json } from "./http.ts";

export const envelopeSchema = z.object({
  nonce: z.string().min(8).max(128),
  timestamp: z.string().min(10).max(64),
  action: z.string().min(1).max(64),
});

const uuid = z.string().uuid();
const tier = z.string().min(1).max(32).regex(/^[a-z0-9_-]+$/i);

export const mintPoxySchema = z.object({
  envelope: envelopeSchema,
  tier,
  collection_id: z.string().min(1).max(64).optional().default("genesis"),
  generation_version: z.number().int().min(1).max(10).optional().default(1),
  link_user_poxy_id: uuid.nullable().optional(),
  rarity_seed: z.string().min(1).max(128).optional(),
  serial_number: z.string().min(1).max(32).optional(),
});

export const transferPoxySchema = z.object({
  envelope: envelopeSchema,
  asset_id: uuid,
  to_owner: uuid,
  event_type: z.enum(["TRANSFER", "TRADE"]).optional().default("TRANSFER"),
  from_owner: uuid.nullable().optional(),
  offer_id: uuid.nullable().optional(),
});

export const destroyPoxySchema = z.object({
  envelope: envelopeSchema,
  asset_id: uuid,
  reason: z.string().min(1).max(64).optional().default("burn"),
  user_poxy_id: uuid.nullable().optional(),
  tier: tier.nullable().optional(),
});

export const assetIdSchema = z.object({
  asset_id: uuid,
});

export const rngRevealSchema = z.object({
  round_id: uuid,
  client_seed: z.union([z.string(), z.number()]).transform(String),
  nonce: z.number().int().min(0).max(1_000_000).optional().default(0),
});

export const verifyEventChainSchema = z.object({
  from_seq: z.number().int().min(1).optional().default(1),
  to_seq: z.number().int().min(1).nullable().optional().default(null),
  verify_signatures: z.boolean().optional().default(true),
});

export const verifyMerkleTreeSchema = z.object({
  tree_type: z.enum(["events", "assets"]).optional().default("events"),
  leaf_hash: z.string().min(64).max(128).optional(),
});

export const publicVerifySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("asset"),
    hash: z.string().min(64).max(128),
    id: z.union([z.string(), z.number()]).optional(),
  }),
  z.object({
    type: z.literal("event"),
    id: z.union([z.string(), z.number()]),
    hash: z.string().min(64).max(128).optional(),
  }),
  z.object({
    type: z.literal("rng"),
    id: z.union([z.string(), z.number()]),
    hash: z.string().min(64).max(128).optional(),
  }),
]);

export const notifyTelegramSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("new_ticket"),
    ticket_id: uuid,
    ticket_id_short: z.string().min(1).max(32),
    username: z.string().min(1).max(64),
    subject: z.string().min(1).max(200),
    created_at: z.string().min(1).max(64),
    message_preview: z.string().max(500).optional(),
  }),
  z.object({
    type: z.literal("new_message"),
    ticket_id: uuid,
    ticket_id_short: z.string().min(1).max(32),
    username: z.string().min(1).max(64),
    subject: z.string().min(1).max(200),
    created_at: z.string().min(1).max(64),
    message_preview: z.string().min(1).max(500),
  }),
]);

export function parseValidated<T>(
  schema: z.ZodType<T>,
  body: unknown,
): { ok: true; data: T } | { ok: false; response: Response } {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: json({
        ok: false,
        error: "Invalid input",
        details: parsed.error.flatten(),
      }, 400),
    };
  }
  return { ok: true, data: parsed.data };
}
