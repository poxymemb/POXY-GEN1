export const DEPT_ACCESS: Record<string, string[]> = {
  superadmin: ["command", "support", "tech", "marketing", "shared"],
  mod: ["support", "tech", "shared"],
  support: ["support", "shared"],
  marketing: ["marketing", "shared"],
  dev: ["tech", "shared"],
}

export function normalizeStaffRole(role: string | null | undefined) {
  const r = (role ?? "support").toLowerCase()
  if (r === "admin") return "superadmin"
  if (r === "dev_topup" || r === "dev") return "dev"
  return r
}

export function dmChannelName(id1: string, id2: string) {
  const [a, b] = [id1, id2].sort()
  return `dm_${a}_${b}`
}

export function channelDisplayName(
  channel: { name: string; type: string },
  currentUserId: string,
  profileMap: Record<string, string | null | undefined>,
) {
  if (channel.type === "direct") {
    const parts = channel.name.replace(/^dm_/, "").split("_")
    const other = parts.find((p) => p !== currentUserId) ?? parts[1] ?? parts[0]
    return `@${profileMap[other] ?? "staff"}`
  }
  return channel.name
}

export function channelDescription(
  channel: { type: string; department: string | null },
) {
  if (channel.type === "direct") return "Direct message"
  if (channel.department) return `${channel.department} team channel`
  return "All staff"
}
