import { createHash } from "crypto"

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex")
}

export function verifyRngRound(round: {
  status: string
  server_seed: string | null
  commit_hash: string
  client_seed: string | null
  nonce: number
  result_hash: string | null
}): {
  display_status: "PENDING" | "REVEALED" | "VERIFIED"
  verified: boolean
  fair: boolean | null
  commit_matches: boolean | null
  result_matches: boolean | null
} {
  if (round.status === "committed" || !round.server_seed) {
    return {
      display_status: "PENDING",
      verified: false,
      fair: null,
      commit_matches: null,
      result_matches: null,
    }
  }

  const commitMatches = sha256Hex(round.server_seed) === round.commit_hash
  const computedResult = sha256Hex(`${round.server_seed}${round.client_seed ?? ""}${round.nonce}`)
  const resultMatches = round.result_hash != null && computedResult === round.result_hash
  const fair = commitMatches && resultMatches

  return {
    display_status: fair ? "VERIFIED" : "REVEALED",
    verified: fair,
    fair,
    commit_matches: commitMatches,
    result_matches: resultMatches,
  }
}

export function tierFromResultHash(resultHash: string | null | undefined): string | null {
  if (!resultHash || resultHash.length < 8) return null
  const hex = resultHash.slice(0, 8)
  let uint = parseInt(hex, 16)
  if (!Number.isFinite(uint) || uint < 0) uint = uint >>> 0
  const f = uint / 4294967296
  if (f < 0.5) return "common"
  if (f < 0.8) return "uncommon"
  if (f < 0.94) return "rare"
  if (f < 0.99) return "epic"
  if (f < 0.999) return "legendary"
  return "mythic"
}
