export const MKT_PLATFORMS = [
  { id: "tiktok", icon: "🎵", label: "TikTok" },
  { id: "instagram", icon: "📷", label: "Instagram" },
  { id: "twitter", icon: "𝕏", label: "Twitter" },
  { id: "discord", icon: "💬", label: "Discord" },
  { id: "telegram", icon: "✈️", label: "Telegram" },
] as const

export type MktPlatformId = (typeof MKT_PLATFORMS)[number]["id"]

export const CAMPAIGN_STATUS_TABS = ["ALL", "DRAFT", "ACTIVE", "PAUSED", "COMPLETED"] as const
export const ASSET_TYPE_FILTERS = ["ALL", "BANNER", "TEMPLATE", "LOGO", "VIDEO", "OTHER"] as const
export const INFLUENCER_STATUS_FILTERS = [
  "ALL",
  "PROSPECT",
  "CONTACTED",
  "NEGOTIATING",
  "ACTIVE",
  "COMPLETED",
] as const
export const ANALYTICS_PERIODS = [7, 30, 90] as const

export function platformIcon(id: string | null | undefined) {
  return MKT_PLATFORMS.find((p) => p.id === id)?.icon ?? "📱"
}

export function platformLabel(id: string | null | undefined) {
  return MKT_PLATFORMS.find((p) => p.id === id)?.label ?? id ?? "—"
}

export function campaignStatusClass(status: string | null | undefined) {
  const s = (status ?? "draft").toLowerCase()
  const map: Record<string, string> = {
    draft: "border-zinc-600/60 bg-zinc-800/40 text-zinc-400",
    active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    paused: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
    completed: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  }
  return map[s] ?? map.draft
}

export function influencerStatusClass(status: string | null | undefined) {
  const s = (status ?? "prospect").toLowerCase()
  const map: Record<string, string> = {
    prospect: "border-zinc-600/60 bg-zinc-800/40 text-zinc-400",
    contacted: "border-blue-500/40 bg-blue-500/10 text-blue-400",
    negotiating: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
    active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    completed: "border-purple-500/40 bg-purple-500/10 text-purple-400",
  }
  return map[s] ?? map.prospect
}

export function dateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function formatShortDate(iso: string | null | undefined) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return "—"
  }
}

export function toLocalDatetimeInput(iso: string | null | undefined) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60_000)
  return local.toISOString().slice(0, 16)
}

export type TrafficRow = { source: string; visits: number; campaignId?: string; campaignName?: string }

const TRAFFIC_LINE = /^\[traffic\]\s*(.+?):\s*(\d+)\s*visits?/i

export function parseTrafficFromNotes(notes: string | null | undefined): TrafficRow[] {
  if (!notes) return []
  const rows: TrafficRow[] = []
  for (const line of notes.split("\n")) {
    const m = line.trim().match(TRAFFIC_LINE)
    if (m) rows.push({ source: m[1].trim(), visits: Number(m[2]) || 0 })
  }
  return rows
}

export function appendTrafficNote(existing: string | null | undefined, source: string, visits: number) {
  const line = `[traffic] ${source}: ${visits} visits`
  return existing?.trim() ? `${existing.trim()}\n${line}` : line
}

export function groupRegistrationsByDay(
  rows: Array<{ created_at: string }>,
  periodDays: number,
): Array<{ date: string; count: number }> {
  const slots: string[] = []
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  for (let i = periodDays - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    slots.push(dateKey(d))
  }

  const map: Record<string, number> = {}
  for (const row of rows) {
    const key = dateKey(new Date(row.created_at))
    if (slots.includes(key)) map[key] = (map[key] ?? 0) + 1
  }

  return slots.map((date) => ({ date, count: map[date] ?? 0 }))
}
