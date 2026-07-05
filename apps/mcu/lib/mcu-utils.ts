import type { SupportTicketRow } from "@/lib/queries"

export type DisplayStatus = "OPEN" | "IN_PROGRESS" | "CLOSED" | "ESCALATED"

export function getDisplayStatus(ticket: Pick<SupportTicketRow, "status" | "is_escalated">): DisplayStatus {
  if (ticket.status === "closed") return "CLOSED"
  if (ticket.is_escalated) return "ESCALATED"
  if (ticket.status === "in_progress") return "IN_PROGRESS"
  return "OPEN"
}

export function getSlaStatus(lastPlayerMessageAt: string | null, status: string) {
  if (status === "closed") return { text: "—", color: "muted" as const, pulse: false }
  if (!lastPlayerMessageAt) return { text: "No msgs", color: "muted" as const, pulse: false }

  const hoursWaiting = (Date.now() - new Date(lastPlayerMessageAt).getTime()) / 3_600_000
  if (hoursWaiting < 1) {
    return { text: `${Math.round(hoursWaiting * 60)}m`, color: "green" as const, pulse: false }
  }
  if (hoursWaiting < 4) {
    const h = Math.floor(hoursWaiting)
    const m = Math.round((hoursWaiting % 1) * 60)
    return { text: `${h}h ${m}m`, color: "yellow" as const, pulse: false }
  }
  return { text: `${Math.floor(hoursWaiting)}h`, color: "red" as const, pulse: true }
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return "—"
  }
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "—"
  }
}

export function shortTicketId(id: string) {
  return id.slice(0, 8).toUpperCase()
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

export function tierColorClass(tier: string | null | undefined) {
  const t = (tier ?? "").toLowerCase()
  const map: Record<string, string> = {
    common: "text-zinc-400",
    uncommon: "text-emerald-400",
    rare: "text-blue-400",
    epic: "text-purple-400",
    legendary: "text-amber-400",
    mythic: "text-pink-400",
    secret: "text-white",
  }
  return map[t] ?? "text-muted-foreground"
}

export function supplyBarColor(pct: number) {
  if (pct >= 80) return "bg-red-500"
  if (pct >= 50) return "bg-yellow-500"
  return "bg-emerald-500"
}

export function formatRelative(iso: string | null | undefined) {
  if (!iso) return "—"
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return formatDateTime(iso)
  } catch {
    return "—"
  }
}
