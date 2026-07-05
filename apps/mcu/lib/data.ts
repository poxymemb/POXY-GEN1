// Centralized mock data for the NULLSPACE LAB MCU command center.
// All copy is placeholder and intended to be replaced by live data feeds.

export type Tenant = {
  id: string
  name: string
  code: string
  color: string
}

export const tenants: Tenant[] = [
  { id: "all", name: "All Tenants", code: "GLOBAL", color: "oklch(0.62 0 0)" },
  { id: "halcyon", name: "Halcyon Systems", code: "HLC", color: "oklch(0.68 0.16 250)" },
  { id: "vantablack", name: "Vantablack Ops", code: "VBO", color: "oklch(0.7 0.16 155)" },
  { id: "meridian", name: "Meridian Cloud", code: "MRD", color: "oklch(0.78 0.15 75)" },
  { id: "obsidian", name: "Obsidian Edge", code: "OBS", color: "oklch(0.64 0.21 25)" },
]

export type Clearance = "L5 // ROOT" | "L4 // ADMIN" | "L3 // LEAD" | "L2 // DEV" | "L1 // EXT"

export type StaffStatus = "ACTIVE" | "IDLE" | "OFFLINE" | "ON_TASK"

export type Staff = {
  id: string
  name: string
  handle: string
  role: string
  tenant: string
  tenantCode: string
  department: string
  status: StaffStatus
  clearance: Clearance
  localTime: string
  timezone: string
  remote: boolean
  workload: number
  activeTask: string
  taskProgress: number
  sessions: number
  apiCalls: number
  lastSeen: string
}

export const staff: Staff[] = [
  {
    id: "U-0091",
    name: "Aria Vance",
    handle: "@avance",
    role: "Infrastructure Lead",
    tenant: "Halcyon Systems",
    tenantCode: "HLC",
    department: "Platform",
    status: "ON_TASK",
    clearance: "L4 // ADMIN",
    localTime: "14:22",
    timezone: "PST",
    remote: true,
    workload: 86,
    activeTask: "Migrate edge cluster eu-west-3",
    taskProgress: 64,
    sessions: 3,
    apiCalls: 12847,
    lastSeen: "now",
  },
  {
    id: "U-0142",
    name: "Kenji Sato",
    handle: "@ksato",
    role: "Security Engineer",
    tenant: "Vantablack Ops",
    tenantCode: "VBO",
    department: "Security",
    status: "ACTIVE",
    clearance: "L5 // ROOT",
    localTime: "07:22",
    timezone: "JST",
    remote: false,
    workload: 92,
    activeTask: "Rotate signing keys // batch 14",
    taskProgress: 88,
    sessions: 5,
    apiCalls: 39210,
    lastSeen: "now",
  },
  {
    id: "U-0188",
    name: "Lena Ortiz",
    handle: "@lortiz",
    role: "Project Lead",
    tenant: "Meridian Cloud",
    tenantCode: "MRD",
    department: "Delivery",
    status: "ACTIVE",
    clearance: "L3 // LEAD",
    localTime: "23:22",
    timezone: "GMT",
    remote: true,
    workload: 71,
    activeTask: "Review Q3 capacity plan",
    taskProgress: 42,
    sessions: 2,
    apiCalls: 5421,
    lastSeen: "2m",
  },
  {
    id: "U-0203",
    name: "Marcus Hale",
    handle: "@mhale",
    role: "External Developer",
    tenant: "Obsidian Edge",
    tenantCode: "OBS",
    department: "Integrations",
    status: "IDLE",
    clearance: "L1 // EXT",
    localTime: "09:22",
    timezone: "EST",
    remote: true,
    workload: 34,
    activeTask: "Webhook retries // billing svc",
    taskProgress: 19,
    sessions: 1,
    apiCalls: 891,
    lastSeen: "11m",
  },
  {
    id: "U-0231",
    name: "Sofia Reyes",
    handle: "@sreyes",
    role: "Platform Engineer",
    tenant: "Halcyon Systems",
    tenantCode: "HLC",
    department: "Platform",
    status: "ON_TASK",
    clearance: "L2 // DEV",
    localTime: "16:22",
    timezone: "CET",
    remote: false,
    workload: 78,
    activeTask: "Deploy auth proxy v2.4.1",
    taskProgress: 73,
    sessions: 4,
    apiCalls: 18034,
    lastSeen: "now",
  },
  {
    id: "U-0277",
    name: "Daniel Kwon",
    handle: "@dkwon",
    role: "SRE",
    tenant: "Meridian Cloud",
    tenantCode: "MRD",
    department: "Reliability",
    status: "ACTIVE",
    clearance: "L3 // LEAD",
    localTime: "23:22",
    timezone: "KST",
    remote: true,
    workload: 55,
    activeTask: "Investigate p99 latency spike",
    taskProgress: 31,
    sessions: 2,
    apiCalls: 9920,
    lastSeen: "now",
  },
  {
    id: "U-0312",
    name: "Priya Nair",
    handle: "@pnair",
    role: "Data Engineer",
    tenant: "Vantablack Ops",
    tenantCode: "VBO",
    department: "Data",
    status: "OFFLINE",
    clearance: "L2 // DEV",
    localTime: "03:22",
    timezone: "IST",
    remote: true,
    workload: 0,
    activeTask: "—",
    taskProgress: 0,
    sessions: 0,
    apiCalls: 412,
    lastSeen: "3h",
  },
  {
    id: "U-0345",
    name: "Theo Lindqvist",
    handle: "@tlind",
    role: "Project Lead",
    tenant: "Obsidian Edge",
    tenantCode: "OBS",
    department: "Delivery",
    status: "ON_TASK",
    clearance: "L3 // LEAD",
    localTime: "22:22",
    timezone: "CET",
    remote: false,
    workload: 67,
    activeTask: "Finalize SLA matrix // tier-2",
    taskProgress: 58,
    sessions: 3,
    apiCalls: 7733,
    lastSeen: "now",
  },
  {
    id: "U-0390",
    name: "Wren Okafor",
    handle: "@wokafor",
    role: "Super Admin",
    tenant: "Halcyon Systems",
    tenantCode: "HLC",
    department: "Command",
    status: "ACTIVE",
    clearance: "L5 // ROOT",
    localTime: "16:22",
    timezone: "CET",
    remote: false,
    workload: 49,
    activeTask: "Audit cross-tenant grants",
    taskProgress: 80,
    sessions: 6,
    apiCalls: 51208,
    lastSeen: "now",
  },
  {
    id: "U-0421",
    name: "Mei Tanaka",
    handle: "@mtanaka",
    role: "QA Engineer",
    tenant: "Meridian Cloud",
    tenantCode: "MRD",
    department: "Quality",
    status: "IDLE",
    clearance: "L2 // DEV",
    localTime: "07:22",
    timezone: "JST",
    remote: true,
    workload: 28,
    activeTask: "Regression suite // checkout",
    taskProgress: 12,
    sessions: 1,
    apiCalls: 2204,
    lastSeen: "24m",
  },
]

export const activityStream = [
  { id: 1, actor: "@ksato", action: "rotated signing key", target: "kms/prod-eu", time: "00:04" },
  { id: 2, actor: "@avance", action: "scaled cluster", target: "eu-west-3 → 12 nodes", time: "01:12" },
  { id: 3, actor: "system", action: "auth hook fired", target: "session/U-0390", time: "01:48" },
  { id: 4, actor: "@sreyes", action: "deployed", target: "auth-proxy@2.4.1", time: "02:33" },
  { id: 5, actor: "@wokafor", action: "granted role", target: "L3 → @tlind", time: "03:01" },
]

export type LogSeverity = "DEBUG" | "INFO" | "WARNING" | "CRITICAL"

export type LogEntry = {
  id: string
  ts: string
  severity: LogSeverity
  source: string
  actor: string
  message: string
  tenant: string
  payload: Record<string, unknown>
}

export const logs: LogEntry[] = [
  {
    id: "LOG-9F2A",
    ts: "2026-06-11T14:22:08.114Z",
    severity: "CRITICAL",
    source: "auth.gateway",
    actor: "@ksato",
    message: "Privileged key rotation executed on prod-eu keyring",
    tenant: "VBO",
    payload: { keyring: "prod-eu", rotated: 14, method: "manual", mfa: true, ip: "10.0.4.21" },
  },
  {
    id: "LOG-7C81",
    ts: "2026-06-11T14:21:55.902Z",
    severity: "WARNING",
    source: "edge.scaler",
    actor: "system",
    message: "Node pool eu-west-3 approaching capacity threshold",
    tenant: "HLC",
    payload: { pool: "eu-west-3", utilization: 0.91, threshold: 0.9, action: "scale_up" },
  },
  {
    id: "LOG-3D04",
    ts: "2026-06-11T14:21:40.331Z",
    severity: "INFO",
    source: "deploy.pipeline",
    actor: "@sreyes",
    message: "Deployment auth-proxy@2.4.1 promoted to production",
    tenant: "HLC",
    payload: { service: "auth-proxy", version: "2.4.1", duration_ms: 48211, status: "success" },
  },
  {
    id: "LOG-1B6E",
    ts: "2026-06-11T14:21:12.770Z",
    severity: "DEBUG",
    source: "api.gateway",
    actor: "@mhale",
    message: "Webhook delivery retried for billing.invoice.paid",
    tenant: "OBS",
    payload: { event: "billing.invoice.paid", attempt: 3, backoff_ms: 4000, code: 502 },
  },
  {
    id: "LOG-8A55",
    ts: "2026-06-11T14:20:59.205Z",
    severity: "CRITICAL",
    source: "rbac.engine",
    actor: "@wokafor",
    message: "Cross-tenant grant elevated for external principal",
    tenant: "GLOBAL",
    payload: { principal: "@tlind", from: "L2", to: "L3", scope: "obsidian/*", approved_by: "@wokafor" },
  },
  {
    id: "LOG-5E29",
    ts: "2026-06-11T14:20:33.018Z",
    severity: "INFO",
    source: "session.manager",
    actor: "system",
    message: "New authenticated session established",
    tenant: "MRD",
    payload: { user: "U-0188", device: "macOS", location: "London, GB", session_ttl: 3600 },
  },
  {
    id: "LOG-2F77",
    ts: "2026-06-11T14:20:01.444Z",
    severity: "WARNING",
    source: "data.pipeline",
    actor: "@pnair",
    message: "Ingestion lag detected on stream events.raw",
    tenant: "VBO",
    payload: { stream: "events.raw", lag_sec: 142, partition: 7, consumer: "etl-04" },
  },
  {
    id: "LOG-6B12",
    ts: "2026-06-11T14:19:48.900Z",
    severity: "DEBUG",
    source: "metrics.collector",
    actor: "system",
    message: "Scrape cycle completed for tenant pool",
    tenant: "GLOBAL",
    payload: { targets: 248, dropped: 0, cycle_ms: 1204 },
  },
]

export type Role = "Super Admin" | "Project Lead" | "External Dev" | "SRE" | "Auditor"
export const roles: Role[] = ["Super Admin", "Project Lead", "External Dev", "SRE", "Auditor"]

export type PermissionNode = { id: string; label: string; group: string }
export const permissionNodes: PermissionNode[] = [
  { id: "core.read", label: "Read", group: "Core Assets" },
  { id: "core.write", label: "Write", group: "Core Assets" },
  { id: "core.delete", label: "Delete", group: "Core Assets" },
  { id: "infra.deploy", label: "Deploy", group: "Infrastructure" },
  { id: "infra.scale", label: "Scale", group: "Infrastructure" },
  { id: "sec.keys", label: "Manage Keys", group: "Security" },
  { id: "sec.audit", label: "View Audit", group: "Security" },
  { id: "rbac.grant", label: "Grant Roles", group: "Access" },
]

// roleId -> permission node ids that are enabled by default
export const defaultGrants: Record<Role, string[]> = {
  "Super Admin": permissionNodes.map((p) => p.id),
  "Project Lead": ["core.read", "core.write", "infra.deploy", "infra.scale", "sec.audit"],
  "External Dev": ["core.read", "core.write"],
  SRE: ["core.read", "infra.deploy", "infra.scale", "sec.audit"],
  Auditor: ["core.read", "sec.audit"],
}

export const auditTrail = [
  { id: "A1", actor: "@wokafor", action: "assigned", role: "Project Lead", to: "@tlind", time: "2026-06-11 03:01" },
  { id: "A2", actor: "@wokafor", action: "revoked", role: "External Dev", to: "@mhale", time: "2026-06-10 21:44" },
  { id: "A3", actor: "@ksato", action: "elevated", role: "SRE", to: "@dkwon", time: "2026-06-10 18:12" },
  { id: "A4", actor: "@wokafor", action: "assigned", role: "Auditor", to: "@pnair", time: "2026-06-09 11:30" },
]

/* ──────────────────────────────────────────────────────────────────────────
   MULTI-TENANT WORKSPACE MODEL
   The parent company (NULLSPACE LAB) supervises subsidiary brands. Each
   workspace exposes its own navigation structure + operational dataset that
   the shell mutates into instantly when the context switches.
   ────────────────────────────────────────────────────────────────────────── */

export type WorkspaceId = "nullspace" | "poxy" | "marketing"

export type NavLeaf = {
  id: string
  label: string
  icon: string // lucide icon name resolved in the sidebar
  href?: string // present for route-linked items (NULLSPACE global modules)
  badge?: string
}

export type NavGroup = {
  group: string
  items: NavLeaf[]
}

export type Workspace = {
  id: WorkspaceId
  name: string
  short: string
  kind: "PARENT" | "SUBSIDIARY"
  descriptor: string
  nav: NavGroup[]
}

export const workspaces: Workspace[] = [
  {
    id: "nullspace",
    name: "NULLSPACE LAB",
    short: "NS",
    kind: "PARENT",
    descriptor: "Global // Parent Company",
    nav: [
      {
        group: "Global",
        items: [
          { id: "ecosystem", label: "Ecosystem Tree", icon: "Network", href: "/team" },
          { id: "console", label: "Global Console", icon: "LayoutGrid", href: "/" },
          { id: "audit", label: "Parent Security Audit", icon: "ScrollText", href: "/logs" },
          { id: "rbac", label: "Global RBAC", icon: "ShieldCheck", href: "/access" },
          { id: "config", label: "System Config", icon: "Settings", href: "/settings" },
        ],
      },
      {
        group: "Operations",
        items: [
          { id: "updates", label: "Updates", icon: "Megaphone", href: "/mcu/updates" },
          { id: "tasks", label: "Tasks", icon: "KanbanSquare", href: "/mcu/tasks" },
          { id: "mytasks", label: "My Tasks", icon: "ClipboardCheck", href: "/mcu/my-tasks" },
          { id: "messenger", label: "Messenger", icon: "MessageSquare", href: "/mcu/messenger" },
          { id: "notes", label: "Notes", icon: "StickyNote", href: "/mcu/notes" },
          { id: "system", label: "System Health", icon: "Monitor", href: "/mcu/system" },
          { id: "changelog", label: "Changelog", icon: "ClipboardList", href: "/mcu/changelog" },
          { id: "handbook", label: "Handbook", icon: "BookOpen", href: "/mcu/handbook" },
          { id: "staff", label: "Staff", icon: "Crown", href: "/mcu/staff" },
        ],
      },
    ],
  },
  {
    id: "poxy",
    name: "POXY WORLD",
    short: "PX",
    kind: "SUBSIDIARY",
    descriptor: "Subsidiary // Gaming Ops",
    nav: [
      {
        group: "Personal",
        items: [
          { id: "dashboard", label: "Dashboard", icon: "Gauge", href: "/mcu" },
          { id: "tasks", label: "Tasks", icon: "ListChecks", href: "/mcu/tasks" },
          { id: "messages", label: "Messages", icon: "MessageSquare", href: "/mcu/messenger" },
        ],
      },
      {
        group: "Support",
        items: [
          { id: "disputes", label: "Disputes", icon: "Scale", href: "/mcu/disputes" },
          { id: "tickets", label: "Support Tickets", icon: "Ticket", href: "/mcu/tickets" },
          { id: "faq", label: "FAQ & Auto Messages", icon: "BookOpen", href: "/mcu/faq" },
          { id: "dossier", label: "Player Dossier", icon: "UserSearch", href: "/mcu/dossier" },
          { id: "rng", label: "RNG Audit", icon: "Dices", href: "/mcu/rng" },
        ],
      },
      {
        group: "Tech",
        items: [
          { id: "telemetry", label: "Telemetry", icon: "Activity", href: "/mcu/telemetry" },
          { id: "alerts", label: "Alerts", icon: "BellRing", href: "/mcu/alerts" },
          { id: "economy", label: "Economy", icon: "Coins", href: "/mcu/economy" },
          { id: "auditlog", label: "Audit Log", icon: "FileClock", href: "/mcu/audit" },
          { id: "health", label: "Sys Health", icon: "HeartPulse", href: "/mcu/system" },
        ],
      },
      {
        group: "Command",
        items: [
          { id: "accountops", label: "Account Ops", icon: "UserCog", href: "/mcu/account-ops" },
          { id: "usermatrix", label: "User Matrix", icon: "Grid3x3", href: "/mcu/user-matrix" },
          { id: "cms", label: "Content CMS", icon: "LayoutTemplate", href: "/mcu/cms" },
          { id: "taskmgr", label: "Task Manager", icon: "KanbanSquare", href: "/mcu/tasks" },
        ],
      },
    ],
  },
  {
    id: "marketing",
    name: "MARKETING",
    short: "MK",
    kind: "SUBSIDIARY",
    descriptor: "Department // Growth & Content",
    nav: [
      {
        group: "Marketing",
        items: [
          { id: "campaigns", label: "Campaigns", icon: "Rocket", href: "/mcu/marketing/campaigns" },
          { id: "calendar", label: "Calendar", icon: "Calendar", href: "/mcu/marketing/calendar" },
          { id: "analytics", label: "Analytics", icon: "LineChart", href: "/mcu/marketing/analytics" },
          { id: "assets", label: "Assets", icon: "Palette", href: "/mcu/marketing/assets" },
          { id: "influencers", label: "Influencers", icon: "Users", href: "/mcu/marketing/influencers" },
        ],
      },
    ],
  },
]

/* ── POXY WORLD operational data ── */

export type DisputeStatus = "OPEN" | "ESCALATED" | "PENDING" | "RESOLVED"
export type DisputePriority = "P0" | "P1" | "P2" | "P3"

export type Dispute = {
  id: string
  player: string
  playerId: string
  category: string
  amount: string
  priority: DisputePriority
  status: DisputeStatus
  age: string
  assignee: string
  game: string
  flags: number
}

export const disputes: Dispute[] = [
  { id: "#402", player: "ShadowFox_88", playerId: "PX-118402", category: "Withdrawal Hold", amount: "$12,480", priority: "P0", status: "ESCALATED", age: "2h 14m", assignee: "@unassigned", game: "Crash Royale", flags: 4 },
  { id: "#401", player: "vortex_main", playerId: "PX-118377", category: "RNG Fairness", amount: "$3,200", priority: "P1", status: "OPEN", age: "44m", assignee: "@m.cole", game: "Plinko X", flags: 2 },
  { id: "#400", player: "QueenBee_21", playerId: "PX-118360", category: "Chargeback", amount: "$890", priority: "P1", status: "OPEN", age: "1h 02m", assignee: "@unassigned", game: "Slots Deluxe", flags: 1 },
  { id: "#399", player: "nullbyte", playerId: "PX-118344", category: "Bonus Abuse", amount: "$5,750", priority: "P2", status: "PENDING", age: "5h 31m", assignee: "@r.diaz", game: "Blackjack Pro", flags: 3 },
  { id: "#398", player: "lucky_lana", playerId: "PX-118301", category: "Deposit Mismatch", amount: "$420", priority: "P3", status: "OPEN", age: "8h 12m", assignee: "@m.cole", game: "Roulette Live", flags: 0 },
  { id: "#397", player: "Ghostwire", playerId: "PX-118290", category: "Account Lockout", amount: "—", priority: "P2", status: "PENDING", age: "12h 04m", assignee: "@unassigned", game: "—", flags: 1 },
  { id: "#396", player: "DonnaPrime", playerId: "PX-118255", category: "Withdrawal Hold", amount: "$22,100", priority: "P0", status: "ESCALATED", age: "3h 47m", assignee: "@r.diaz", game: "VIP Baccarat", flags: 5 },
  { id: "#395", player: "axl_rose99", playerId: "PX-118241", category: "RNG Fairness", amount: "$1,050", priority: "P2", status: "OPEN", age: "6h 19m", assignee: "@unassigned", game: "Crash Royale", flags: 2 },
  { id: "#394", player: "mirthgames", playerId: "PX-118203", category: "Chargeback", amount: "$640", priority: "P3", status: "RESOLVED", age: "1d 02h", assignee: "@m.cole", game: "Slots Deluxe", flags: 0 },
  { id: "#393", player: "tessa_v", playerId: "PX-118188", category: "Bonus Abuse", amount: "$3,980", priority: "P1", status: "PENDING", age: "9h 55m", assignee: "@r.diaz", game: "Plinko X", flags: 3 },
]

export type Player = {
  id: string
  handle: string
  tier: "BRONZE" | "SILVER" | "GOLD" | "VIP" | "WHALE"
  status: "ACTIVE" | "FLAGGED" | "FROZEN"
  joined: string
  country: string
  ltv: string
  balance: string
  deposits: string
  withdrawals: string
  riskScore: number
  kyc: "VERIFIED" | "PENDING" | "REJECTED"
  lastSession: string
  flags: { id: string; label: string; severity: LogSeverity; time: string }[]
  recentBets: { id: string; game: string; stake: string; outcome: "WIN" | "LOSS"; payout: string; time: string }[]
}

export const players: Record<string, Player> = {
  "PX-118402": {
    id: "PX-118402",
    handle: "ShadowFox_88",
    tier: "WHALE",
    status: "FLAGGED",
    joined: "2023-04-18",
    country: "CA",
    ltv: "$184,200",
    balance: "$12,480",
    deposits: "$211,000",
    withdrawals: "$26,800",
    riskScore: 82,
    kyc: "VERIFIED",
    lastSession: "14m ago",
    flags: [
      { id: "F1", label: "Velocity: 9 withdrawals / 1h", severity: "CRITICAL", time: "00:12" },
      { id: "F2", label: "Geo mismatch on last login", severity: "WARNING", time: "01:40" },
      { id: "F3", label: "Bonus wager ratio anomaly", severity: "WARNING", time: "03:22" },
    ],
    recentBets: [
      { id: "B1", game: "Crash Royale", stake: "$2,000", outcome: "WIN", payout: "$9,400", time: "00:08" },
      { id: "B2", game: "Crash Royale", stake: "$2,000", outcome: "LOSS", payout: "$0", time: "00:11" },
      { id: "B3", game: "VIP Baccarat", stake: "$5,000", outcome: "WIN", payout: "$9,800", time: "00:19" },
      { id: "B4", game: "Plinko X", stake: "$800", outcome: "LOSS", payout: "$0", time: "00:24" },
    ],
  },
  "PX-118255": {
    id: "PX-118255",
    handle: "DonnaPrime",
    tier: "VIP",
    status: "FROZEN",
    joined: "2022-11-02",
    country: "GB",
    ltv: "$96,540",
    balance: "$22,100",
    deposits: "$140,300",
    withdrawals: "$43,200",
    riskScore: 91,
    kyc: "PENDING",
    lastSession: "3h ago",
    flags: [
      { id: "F1", label: "Withdrawal exceeds daily ceiling", severity: "CRITICAL", time: "00:03" },
      { id: "F2", label: "KYC re-verification overdue", severity: "CRITICAL", time: "02:10" },
    ],
    recentBets: [
      { id: "B1", game: "VIP Baccarat", stake: "$10,000", outcome: "WIN", payout: "$19,400", time: "01:02" },
      { id: "B2", game: "Roulette Live", stake: "$3,000", outcome: "LOSS", payout: "$0", time: "01:14" },
    ],
  },
}

// Default dossier shown when a dispute without a detailed player record is selected.
export const fallbackPlayer: Player = {
  id: "PX-000000",
  handle: "unknown_player",
  tier: "BRONZE",
  status: "ACTIVE",
  joined: "—",
  country: "—",
  ltv: "—",
  balance: "—",
  deposits: "—",
  withdrawals: "—",
  riskScore: 0,
  kyc: "PENDING",
  lastSession: "—",
  flags: [],
  recentBets: [],
}

export const poxyMetrics = [
  { label: "Open", value: "402" },
  { label: "Escalated", value: "38" },
  { label: "SLA Risk", value: "12" },
  { label: "Resolved 24h", value: "517" },
]
