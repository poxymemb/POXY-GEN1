// =============================================================================
// verify_event_chain — walk the append-only ledger and confirm the hash chain
// is intact, plus spot-verify ED25519 signatures over the canonical bodies.
// =============================================================================

import { adminClient, getUserId } from "../_shared/supabase.ts";
import { verifyWithVersion } from "../_shared/kms.ts";
import { handleOptions, json, writeAudit } from "../_shared/http.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { parseValidated, verifyEventChainSchema } from "../_shared/schemas.ts";

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const userId = await getUserId(req);
    if (!userId) return json({ ok: false, error: "Unauthorized" }, 401);

    const admin = adminClient();
    const limited = await enforceRateLimit(admin, userId, "verify_event_chain", 10);
    if (limited) return limited;

    const parsed = parseValidated(verifyEventChainSchema, await req.json().catch(() => ({})));
    if (!parsed.ok) return parsed.response;
    const { from_seq, to_seq, verify_signatures } = parsed.data;

    // 1. SQL verifies hash linkage + recomputation across the whole range.
    const { data: chain, error } = await admin.rpc("verify_event_chain", {
      p_from_seq: from_seq,
      p_to_seq: to_seq,
    });
    if (error) return json({ ok: false, error: error.message }, 400);

    // 2. Verify a sample of signatures (most recent 100) against public keys.
    let signaturesChecked = 0;
    let signatureFailures = 0;
    if (verify_signatures) {
      const { data: rows } = await admin
        .from("ledger_events")
        .select("seq, canonical, signature, key_version")
        .gte("seq", from_seq)
        .order("seq", { ascending: false })
        .limit(100);
      for (const r of rows ?? []) {
        if (!r.signature || r.key_version == null) continue;
        signaturesChecked++;
        const ok = await verifyWithVersion(admin, r.canonical, r.signature, r.key_version);
        if (!ok) signatureFailures++;
      }
    }

    const ok = Boolean(chain?.ok && signatureFailures === 0);
    if (!ok) await writeAudit(admin, "VERIFY_FAIL", userId, req, { chain, signatureFailures });

    return json({
      ok,
      verified_count: chain?.verified_count ?? 0,
      first_break_seq: chain?.first_break_seq ?? null,
      head_hash: chain?.head_hash,
      signatures_checked: signaturesChecked,
      signature_failures: signatureFailures,
    });
  } catch (e) {
    return json({ ok: false, error: String(e?.message ?? e) }, 400);
  }
});
