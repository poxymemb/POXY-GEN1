// =============================================================================
// verify_merkle_tree — rebuild a Merkle tree over current leaves, produce an
// inclusion proof for a target leaf, and confirm the recomputed root matches the
// latest anchored root in public.merkle_roots.
// =============================================================================

import { adminClient, getUserId } from "../_shared/supabase.ts";
import { merkleProof, merkleRoot, verifyMerkleProof } from "../_shared/crypto.ts";
import { handleOptions, json, safeErrorResponse } from "../_shared/http.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { parseValidated, verifyMerkleTreeSchema } from "../_shared/schemas.ts";

async function loadLeaves(admin: ReturnType<typeof adminClient>, tree: string): Promise<string[]> {
  if (tree === "events") {
    const { data } = await admin.from("ledger_events").select("event_hash").order("seq", { ascending: true });
    return (data ?? []).map((r: { event_hash: string }) => r.event_hash);
  }
  const { data } = await admin
    .from("poxy_assets").select("poxy_hash, created_at, id")
    .order("created_at", { ascending: true }).order("id", { ascending: true });
  return (data ?? []).map((r: { poxy_hash: string }) => r.poxy_hash);
}

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const userId = await getUserId(req);
    if (!userId) return json({ ok: false, error: "Unauthorized" }, 401);

    const admin = adminClient();
    const limited = await enforceRateLimit(admin, userId, "verify_merkle_tree", 10);
    if (limited) return limited;

    const parsed = parseValidated(verifyMerkleTreeSchema, await req.json().catch(() => ({})));
    if (!parsed.ok) return parsed.response;
    const { tree_type, leaf_hash } = parsed.data;
    const leaves = await loadLeaves(admin, tree_type);
    if (!leaves.length) return json({ ok: false, error: "Tree is empty" }, 400);

    const computedRoot = await merkleRoot(leaves);

    // Compare with the latest anchored root.
    const { data: anchored } = await admin
      .from("merkle_roots").select("root_hash, leaf_count, created_at")
      .eq("tree_type", tree_type).order("created_at", { ascending: false }).limit(1).maybeSingle();

    let proof = null;
    let proofValid: boolean | null = null;
    if (leaf_hash) {
      const idx = leaves.indexOf(leaf_hash);
      if (idx === -1) return json({ ok: false, error: "leaf_hash not in tree", computed_root: computedRoot }, 404);
      const p = await merkleProof(leaves, idx);
      proof = p.proof;
      proofValid = await verifyMerkleProof(leaf_hash, p.proof, computedRoot);
    }

    return json({
      ok: true,
      tree_type,
      leaf_count: leaves.length,
      computed_root: computedRoot,
      anchored_root: anchored?.root_hash ?? null,
      root_matches_anchor: anchored ? anchored.root_hash === computedRoot : null,
      leaf_hash: leaf_hash ?? null,
      proof,
      proof_valid: proofValid,
    });
  } catch (e) {
    return safeErrorResponse(e, "verify_merkle_tree", 400, "Invalid request");
  }
});
