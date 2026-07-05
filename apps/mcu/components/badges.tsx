import { cn } from "@/lib/utils"
import type { StaffStatus, LogSeverity } from "@/lib/data"

const statusMap: Record<StaffStatus, { label: string; dot: string; text: string }> = {
  ACTIVE: { label: "Active", dot: "bg-success", text: "text-success" },
  ON_TASK: { label: "On Task", dot: "bg-info", text: "text-info" },
  IDLE: { label: "Idle", dot: "bg-warning", text: "text-warning" },
  OFFLINE: { label: "Offline", dot: "bg-muted-foreground", text: "text-muted-foreground" },
}

export function StatusBadge({ status }: { status: StaffStatus }) {
  const s = statusMap[status]
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide">
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      <span className={s.text}>{s.label}</span>
    </span>
  )
}

const severityMap: Record<LogSeverity, string> = {
  DEBUG: "border-border text-muted-foreground bg-muted",
  INFO: "border-info/30 text-info bg-info/10",
  WARNING: "border-warning/30 text-warning bg-warning/10",
  CRITICAL: "border-destructive/40 text-destructive bg-destructive/10",
}

export function SeverityBadge({ severity }: { severity: LogSeverity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[3px] border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-widest",
        severityMap[severity],
      )}
    >
      {severity}
    </span>
  )
}

export function ClearanceBadge({ value }: { value: string }) {
  const isRoot = value.startsWith("L5")
  const isAdmin = value.startsWith("L4")
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[3px] border px-1.5 py-0.5 font-mono text-[10px] tracking-wide",
        isRoot
          ? "border-destructive/40 text-destructive bg-destructive/10"
          : isAdmin
            ? "border-accent/40 text-accent bg-accent/10"
            : "border-border text-muted-foreground",
      )}
    >
      {value}
    </span>
  )
}

export function WorkloadBar({ value }: { value: number }) {
  // Monochrome Vercel-style meter: white fill at high load, dimming to zinc
  // as load drops. Critical load (>=85%) is the only functional signal (red).
  const color =
    value >= 85
      ? "bg-destructive"
      : value >= 60
        ? "bg-foreground"
        : value > 0
          ? "bg-muted-foreground"
          : "bg-border"
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 font-mono text-[11px] tabular-nums text-muted-foreground">{value}%</span>
    </div>
  )
}
