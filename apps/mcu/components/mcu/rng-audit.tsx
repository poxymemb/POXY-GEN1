"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { RngProof, RngRoundRow } from "@/lib/queries"
import { formatDateTime, shortTicketId, tierColorClass } from "@/lib/mcu-utils"

export function RngAuditModule() {
  const [roundId, setRoundId] = useState("")
  const [proof, setProof] = useState<RngProof | null>(null)
  const [recent, setRecent] = useState<RngRoundRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRecent = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/mcu/rng")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load rounds")
      setRecent(data.recent ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rounds")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadProof = useCallback(async (id: string) => {
    const trimmed = id.trim()
    if (!trimmed) return

    setSearchLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/mcu/rng?round_id=${encodeURIComponent(trimmed)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Round not found")
      setProof(data.proof)
      setRoundId(trimmed)
    } catch (err) {
      setProof(null)
      setError(err instanceof Error ? err.message : "Round not found")
    } finally {
      setSearchLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRecent()
  }, [loadRecent])

  const commitVerified =
    proof?.display_status !== "PENDING" && proof?.commit_matches === true && proof?.result_matches === true

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border px-5 py-3">
        <h1 className="font-mono text-sm font-semibold uppercase tracking-widest text-foreground">RNG Audit</h1>
        <p className="font-mono text-[10px] text-muted-foreground">POXY WORLD // Provably Fair Verification</p>
      </header>

      <div className="border-b border-border px-5 py-4">
        <div className="flex max-w-xl gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={roundId}
              onChange={(e) => setRoundId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void loadProof(roundId)}
              placeholder="round_id (UUID)…"
              className="w-full rounded-md border border-border bg-background py-2 pl-8 pr-3 font-mono text-xs outline-none focus:border-foreground/30"
            />
          </div>
          <Button onClick={() => void loadProof(roundId)} disabled={searchLoading}>
            {searchLoading ? <Loader2 className="size-3.5 animate-spin" /> : "Verify"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-5 py-2 font-mono text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 scrollbar-thin">
        {proof && (
          <section className="mb-6 rounded-lg border border-border bg-background/40 p-5">
            <h2 className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              RNG Proof
            </h2>
            <div className="grid gap-3 font-mono text-[11px] sm:grid-cols-2">
              <ProofRow label="round_id" value={proof.id} />
              <ProofRow label="commit_hash" value={proof.commit_hash} truncate />
              <ProofRow label="reveal_hash" value={proof.result_hash ?? "—"} truncate />
              <ProofRow
                label="result_tier"
                value={(proof.result_tier ?? "—").toUpperCase()}
                className={tierColorClass(proof.result_tier)}
              />
              <ProofRow label="status" value={proof.display_status} />
              <ProofRow
                label="verification"
                value="SHA-256(server_seed) === commit_hash"
                sub={
                  proof.display_status === "PENDING"
                    ? "Awaiting reveal"
                    : proof.commit_matches
                      ? "Commit hash matches"
                      : "Commit mismatch"
                }
              />
            </div>
            <div
              className={cn(
                "mt-4 rounded-md border px-4 py-3 text-center font-mono text-sm font-semibold",
                proof.display_status === "PENDING"
                  ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-400"
                  : commitVerified
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "border-red-500/40 bg-red-500/10 text-red-400",
              )}
            >
              {proof.display_status === "PENDING"
                ? "⏳ PENDING REVEAL"
                : commitVerified
                  ? "✅ FAIR"
                  : "❌ TAMPERED"}
            </div>
          </section>
        )}

        <section className="rounded-lg border border-border bg-background/40 p-5">
          <h2 className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Recent Rounds
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-[11px]">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-3">Round</th>
                    <th className="pb-2 pr-3">Tier</th>
                    <th className="pb-2 pr-3">Status</th>
                    <th className="pb-2 pr-3">Created</th>
                    <th className="pb-2">Verified</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((round) => (
                    <tr
                      key={round.id}
                      className="cursor-pointer border-b border-border/50 transition-colors hover:bg-sidebar-accent/30"
                      onClick={() => void loadProof(round.id)}
                    >
                      <td className="py-2 pr-3 text-foreground">#{shortTicketId(round.id)}</td>
                      <td className={cn("py-2 pr-3 uppercase", tierColorClass(round.result_tier))}>
                        {round.result_tier ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{round.display_status}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{formatDateTime(round.committed_at)}</td>
                      <td className="py-2">
                        {round.verified ? (
                          <span className="text-emerald-400">✓</span>
                        ) : round.display_status === "PENDING" ? (
                          <span className="text-yellow-400">—</span>
                        ) : (
                          <span className="text-red-400">✗</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function ProofRow({
  label,
  value,
  sub,
  truncate,
  className,
}: {
  label: string
  value: string
  sub?: string
  truncate?: boolean
  className?: string
}) {
  return (
    <div>
      <span className="block text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={cn("block break-all text-foreground", truncate && "truncate", className)}>{value}</span>
      {sub && <span className="block text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  )
}
