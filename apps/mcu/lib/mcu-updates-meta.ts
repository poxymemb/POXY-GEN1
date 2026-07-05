export type UpdateFilterTab = "ALL" | "URGENT" | "POLICY" | "MCU" | "GAME" | "INFO"

export const UPDATE_FILTER_TABS: UpdateFilterTab[] = ["ALL", "URGENT", "POLICY", "MCU", "GAME", "INFO"]

export const UPDATE_TYPE_META: Record<
  string,
  { label: string; badge: string; filterKey: UpdateFilterTab | "ALL"; className: string }
> = {
  urgent: {
    label: "URGENT",
    badge: "🔴 URGENT",
    filterKey: "URGENT",
    className: "border-red-500/40 bg-red-500/10 text-red-400",
  },
  policy: {
    label: "POLICY",
    badge: "🟠 POLICY",
    filterKey: "POLICY",
    className: "border-orange-500/40 bg-orange-500/10 text-orange-400",
  },
  mcu_update: {
    label: "MCU",
    badge: "🟡 MCU",
    filterKey: "MCU",
    className: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
  },
  game_update: {
    label: "GAME",
    badge: "🟢 GAME",
    filterKey: "GAME",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  },
  general: {
    label: "INFO",
    badge: "🔵 INFO",
    filterKey: "INFO",
    className: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  },
}

export function filterTabToDbType(tab: UpdateFilterTab): string | null {
  switch (tab) {
    case "URGENT":
      return "urgent"
    case "POLICY":
      return "policy"
    case "MCU":
      return "mcu_update"
    case "GAME":
      return "game_update"
    case "INFO":
      return "general"
    default:
      return null
  }
}

export function getUpdateTypeMeta(type: string) {
  return UPDATE_TYPE_META[type] ?? UPDATE_TYPE_META.general
}

export const PUBLISH_TYPE_OPTIONS = [
  { value: "urgent", label: "🔴 URGENT" },
  { value: "policy", label: "🟠 POLICY" },
  { value: "mcu_update", label: "🟡 MCU" },
  { value: "game_update", label: "🟢 GAME" },
  { value: "general", label: "🔵 INFO" },
]
