import { supabaseAdmin } from "@/lib/supabase"
import { tierFromResultHash, verifyRngRound } from "@/lib/rng-verify"

function normalizeJoin<T>(value: T | T[] | null): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export type PlayerProfile = {
  id: string
  username: string | null
  avatar_url: string | null
  created_at: string
  px_balance: number
  xp_level: number
  xp_total: number
}

export type DisputeTicket = {
  id: string
  user_id: string
  subject: string
  status: "open" | "in_progress" | "closed"
  assigned_to: string | null
  created_at: string
  updated_at: string
  closed_at: string | null
  is_abuse?: boolean
  profiles: {
    username: string | null
    px_balance: number
    xp_level: number
  } | null
}

export type TicketMessage = {
  id: string
  ticket_id: string
  sender_id: string | null
  is_staff: boolean
  body: string | null
  image_url: string | null
  is_auto: boolean
  created_at: string
  profiles?: {
    username: string | null
    avatar_url: string | null
  } | null
}

export type SupportTicketRow = DisputeTicket & {
  tags: string[]
  is_escalated: boolean
  last_player_message_at: string | null
  assignee_username: string | null
}

export type TicketPlayerSnapshot = {
  user_id: string
  username: string | null
  px_balance: number
  xp_level: number
  member_since: string
  last_drops: string[]
  compensations_count: number
  is_online: boolean
  last_seen: string | null
}

export type PlayerDossier = {
  profile: {
    id: string
    username: string | null
    avatar_url: string | null
    px_balance: number
    xp_level: number
    xp_total: number
    balance: number
    created_at: string
    is_frozen: boolean
    is_blocked: boolean
    ticket_banned_until: string | null
    account_hash: string | null
  }
  dna_by_tier: Record<string, number>
  ledger_events: Array<{
    id: string
    seq: number | null
    event_type: string
    event_hash: string
    event_timestamp: string
    payload: Record<string, unknown>
  }>
  compensation_history: AuditLogEntry[]
  support_tickets: Array<{
    id: string
    subject: string
    status: string
    created_at: string
    updated_at: string
    is_abuse: boolean
  }>
  pity_counters: Record<string, number> | null
  login_streak: {
    current_streak: number
    longest_streak: number
    total_logins: number
    last_login_date: string | null
  } | null
}

export type PoxyMetrics = {
  total_pc_circulation: number
  total_pc_spent: number
  total_minted: number
  total_burned: number
  total_players: number
  inflation_rate_7d: number
}

export type StaffMember = {
  email: string
  role: string
  created_at: string
  profiles: {
    id: string
    username: string | null
    avatar_url: string | null
  }
}

export type AuditLogEntry = {
  id: string
  admin_id: string | null
  target_user_id: string | null
  action_type: string
  payload: Record<string, unknown>
  reason: string
  created_at: string
  profiles: {
    username: string | null
  } | null
}

export type Gen1Tier = {
  tier: string
  cap: number
  minted: number
  remaining: number
  sold_out: boolean
  pct: number
}

export type Gen1SupplyStatus = {
  ok: boolean
  total_cap: number
  total_minted: number
  total_remaining: number
  fully_exhausted: boolean
  legendary_remaining: number
  legendary_scarcity: boolean
  tiers: Gen1Tier[]
}

export async function getPlayers(limit = 50): Promise<PlayerProfile[]> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, username, avatar_url, created_at, px_balance, xp_level, xp_total")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function getDisputes(status?: DisputeTicket["status"]): Promise<DisputeTicket[]> {
  let query = supabaseAdmin
    .from("support_tickets")
    .select(
      `
      id,
      user_id,
      subject,
      status,
      assigned_to,
      created_at,
      updated_at,
      closed_at,
      is_abuse,
      profiles!user_id (
        username,
        px_balance,
        xp_level
      )
    `,
    )
    .order("updated_at", { ascending: false })

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []).map((row) => ({
    ...row,
    profiles: normalizeJoin(row.profiles),
  })) as DisputeTicket[]
}

async function getLastPlayerMessageMap(ticketIds: string[]): Promise<Record<string, string>> {
  if (!ticketIds.length) return {}

  const { data, error } = await supabaseAdmin
    .from("ticket_messages")
    .select("ticket_id, created_at")
    .in("ticket_id", ticketIds)
    .eq("is_staff", false)
    .eq("is_auto", false)
    .order("created_at", { ascending: false })

  if (error) throw error

  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    if (!map[row.ticket_id]) {
      map[row.ticket_id] = row.created_at
    }
  }
  return map
}

async function getEscalatedTicketIds(ticketIds: string[]): Promise<Set<string>> {
  if (!ticketIds.length) return new Set()

  const { data, error } = await supabaseAdmin
    .from("admin_actions")
    .select("payload")
    .eq("action_type", "ticket_escalation")
    .order("created_at", { ascending: false })
    .limit(500)

  if (error) throw error

  const ids = new Set<string>()
  const ticketIdSet = new Set(ticketIds)
  for (const row of data ?? []) {
    const payload = row.payload as { ticket_id?: string }
    if (payload.ticket_id && ticketIdSet.has(payload.ticket_id)) {
      ids.add(payload.ticket_id)
    }
  }
  return ids
}

async function getTicketTagsMap(ticketIds: string[]): Promise<Record<string, string[]>> {
  if (!ticketIds.length) return {}

  const { data, error } = await supabaseAdmin
    .from("support_ticket_tags")
    .select("ticket_id, tag")
    .in("ticket_id", ticketIds)

  if (error) {
    if (error.code === "42P01") return {}
    throw error
  }

  const map: Record<string, string[]> = {}
  for (const row of data ?? []) {
    if (!map[row.ticket_id]) map[row.ticket_id] = []
    map[row.ticket_id].push(row.tag)
  }
  return map
}

async function getUsernameMap(userIds: string[]): Promise<Record<string, string>> {
  if (!userIds.length) return {}

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, username")
    .in("id", userIds)

  if (error) throw error

  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    map[row.id] = row.username ?? "staff"
  }
  return map
}

export async function getSupportTickets(options?: {
  status?: DisputeTicket["status"] | "abuse"
  search?: string
}): Promise<SupportTicketRow[]> {
  let tickets = await getDisputes(
    options?.status && options.status !== "abuse" ? options.status : undefined,
  )

  if (options?.status === "abuse") {
    tickets = tickets.filter((t) => t.is_abuse === true)
  }

  if (options?.search?.trim()) {
    const q = options.search.trim().toLowerCase()
    tickets = tickets.filter((t) => {
      const username = t.profiles?.username?.toLowerCase() ?? ""
      return username.includes(q) || t.subject.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
    })
  }

  const ticketIds = tickets.map((t) => t.id)
  const assigneeIds = [...new Set(tickets.map((t) => t.assigned_to).filter(Boolean))] as string[]

  const [slaMap, escalatedIds, tagsMap, assigneeMap] = await Promise.all([
    getLastPlayerMessageMap(ticketIds),
    getEscalatedTicketIds(ticketIds),
    getTicketTagsMap(ticketIds),
    getUsernameMap(assigneeIds),
  ])

  return tickets.map((ticket) => ({
    ...ticket,
    tags: tagsMap[ticket.id] ?? [],
    is_escalated: escalatedIds.has(ticket.id),
    last_player_message_at: slaMap[ticket.id] ?? null,
    assignee_username: ticket.assigned_to ? (assigneeMap[ticket.assigned_to] ?? null) : null,
  }))
}

export async function getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const { data, error } = await supabaseAdmin
    .from("ticket_messages")
    .select(
      `
      id,
      ticket_id,
      sender_id,
      is_staff,
      body,
      image_url,
      is_auto,
      created_at,
      profiles:sender_id (
        username,
        avatar_url
      )
    `,
    )
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true })

  if (error) throw error

  return (data ?? []).map((row) => ({
    ...row,
    profiles: normalizeJoin(row.profiles),
  })) as TicketMessage[]
}

export async function getTicketById(ticketId: string): Promise<SupportTicketRow | null> {
  const tickets = await getSupportTickets()
  return tickets.find((t) => t.id === ticketId) ?? null
}

export async function getTicketPlayerSnapshot(userId: string): Promise<TicketPlayerSnapshot | null> {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, username, px_balance, xp_level, created_at")
    .eq("id", userId)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile) return null

  const [{ data: drops }, { count: compensationsCount }, { data: presence }] = await Promise.all([
    supabaseAdmin
      .from("user_poxy")
      .select("poxy_tier")
      .eq("user_id", userId)
      .order("dropped_at", { ascending: false })
      .limit(3),
    supabaseAdmin
      .from("admin_actions")
      .select("id", { count: "exact", head: true })
      .eq("target_user_id", userId)
      .eq("action_type", "compensate_pc"),
    supabaseAdmin.from("user_presence").select("is_online, last_seen").eq("user_id", userId).maybeSingle(),
  ])

  return {
    user_id: profile.id,
    username: profile.username,
    px_balance: profile.px_balance ?? 0,
    xp_level: profile.xp_level ?? 0,
    member_since: profile.created_at,
    last_drops: (drops ?? []).map((d) => (d.poxy_tier ?? "common").toUpperCase()),
    compensations_count: compensationsCount ?? 0,
    is_online: presence?.is_online ?? false,
    last_seen: presence?.last_seen ?? null,
  }
}

async function resolveProfileQuery(query: string): Promise<string | null> {
  const raw = query.trim().replace(/^@/, "")
  if (!raw) return null

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)

  let dbQuery = supabaseAdmin.from("profiles").select("id")
  if (isUuid) {
    dbQuery = dbQuery.eq("id", raw)
  } else {
    dbQuery = dbQuery.ilike("username", raw)
  }

  const { data, error } = await dbQuery.maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

export async function getPlayerDossier(query: string): Promise<PlayerDossier | null> {
  const userId = await resolveProfileQuery(query)
  if (!userId) return null

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, username, avatar_url, px_balance, xp_level, xp_total, balance, created_at, is_frozen, is_blocked, ticket_banned_until, account_hash",
    )
    .eq("id", userId)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile) return null

  const [
    { data: inventory },
    { data: ledgerEvents },
    { data: compensations },
    { data: tickets },
    { data: pity },
    { data: streak },
  ] = await Promise.all([
    supabaseAdmin.from("user_poxy").select("poxy_tier").eq("user_id", userId),
    supabaseAdmin
      .from("ledger_events")
      .select("id, seq, event_type, event_hash, event_timestamp, payload")
      .eq("actor_id", userId)
      .order("seq", { ascending: false })
      .limit(20),
    supabaseAdmin
      .from("admin_actions")
      .select(
        `
        id,
        admin_id,
        target_user_id,
        action_type,
        payload,
        reason,
        created_at,
        profiles!admin_id (
          username
        )
      `,
      )
      .eq("target_user_id", userId)
      .in("action_type", ["compensate_pc", "grant_badge", "grant_asset", "note"])
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("support_tickets")
      .select("id, subject, status, created_at, updated_at, is_abuse")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabaseAdmin.from("pity_counters").select("*").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("login_streaks").select("*").eq("user_id", userId).maybeSingle(),
  ])

  const dna_by_tier: Record<string, number> = {}
  for (const item of inventory ?? []) {
    const tier = (item.poxy_tier ?? "common").toUpperCase()
    dna_by_tier[tier] = (dna_by_tier[tier] ?? 0) + 1
  }

  return {
    profile: {
      id: profile.id,
      username: profile.username,
      avatar_url: profile.avatar_url,
      px_balance: profile.px_balance ?? 0,
      xp_level: profile.xp_level ?? 0,
      xp_total: profile.xp_total ?? 0,
      balance: Number(profile.balance ?? 0),
      created_at: profile.created_at,
      is_frozen: profile.is_frozen ?? false,
      is_blocked: profile.is_blocked ?? false,
      ticket_banned_until: profile.ticket_banned_until ?? null,
      account_hash: profile.account_hash ?? null,
    },
    dna_by_tier,
    ledger_events: (ledgerEvents ?? []).map((e) => ({
      id: e.id,
      seq: e.seq,
      event_type: e.event_type,
      event_hash: e.event_hash,
      event_timestamp: e.event_timestamp,
      payload: (e.payload as Record<string, unknown>) ?? {},
    })),
    compensation_history: (compensations ?? []).map((row) => ({
      ...row,
      profiles: normalizeJoin(row.profiles),
    })) as AuditLogEntry[],
    support_tickets: tickets ?? [],
    pity_counters: pity
      ? {
          standard_opens: pity.standard_opens,
          standard_epic_pity: pity.standard_epic_pity,
          standard_leg_pity: pity.standard_leg_pity,
          vip_opens: pity.vip_opens,
          vip_epic_pity: pity.vip_epic_pity,
          vip_mythic_pity: pity.vip_mythic_pity,
          genesis_opens: pity.genesis_opens,
        }
      : null,
    login_streak: streak
      ? {
          current_streak: streak.current_streak,
          longest_streak: streak.longest_streak,
          total_logins: streak.total_logins,
          last_login_date: streak.last_login_date,
        }
      : null,
  }
}

export async function getPoxyMetrics(): Promise<PoxyMetrics | null> {
  const { data, error } = await supabaseAdmin.rpc("get_supply_overview")

  if (error) throw error
  if (!data || !Array.isArray(data) || data.length === 0) return null
  return data[0] as PoxyMetrics
}

export async function getStaff(): Promise<StaffMember[]> {
  const { data, error } = await supabaseAdmin
    .from("admin_emails")
    .select(
      `
      email,
      role,
      created_at,
      profiles!inner (
        id,
        username,
        avatar_url
      )
    `,
    )
    .order("created_at", { ascending: true })

  if (error) throw error
  return (data ?? []).map((row) => ({
    ...row,
    profiles: normalizeJoin(row.profiles),
  })) as StaffMember[]
}

export async function getAuditLog(limit = 100): Promise<AuditLogEntry[]> {
  const { data, error } = await supabaseAdmin
    .from("admin_actions")
    .select(
      `
      id,
      admin_id,
      target_user_id,
      action_type,
      payload,
      reason,
      created_at,
      profiles!admin_id (
        username
      )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []).map((row) => ({
    ...row,
    profiles: normalizeJoin(row.profiles),
  })) as AuditLogEntry[]
}

export async function getGen1Supply(): Promise<Gen1SupplyStatus | null> {
  const { data, error } = await supabaseAdmin.rpc("get_gen1_supply_status")

  if (error) throw error
  return (data as Gen1SupplyStatus | null) ?? null
}

export type RngRoundRow = {
  id: string
  user_id: string
  commit_hash: string
  result_hash: string | null
  status: string
  committed_at: string
  revealed_at: string | null
  result_tier: string | null
  display_status: "PENDING" | "REVEALED" | "VERIFIED"
  verified: boolean
  fair: boolean | null
}

export type RngProof = RngRoundRow & {
  client_seed: string | null
  nonce: number
  server_seed: string | null
  commit_matches: boolean | null
  result_matches: boolean | null
}

export type DisputeRow = {
  id: string
  source: "ticket" | "admin_action"
  type: "ABUSE" | "COMPENSATION" | "FREEZE" | "BAN"
  player_id: string
  player_username: string | null
  amount_or_reason: string
  status: string
  created_at: string
  admin_username: string | null
  payload: Record<string, unknown>
}

export type DisputesStats = {
  compensations_this_month: number
  total_px_given_out: number
  abuse_count: number
}

export type Gen1SupplyCap = {
  poxy_tier: string
  cap: number
  minted: number
}

export type EconomyHealth = {
  supply_overview: PoxyMetrics | null
  gen1_caps: Gen1SupplyCap[]
  px_circulation: number
  total_burn_events: number
  total_px_purchased: number
  recent_ledger: Array<{
    id: string
    seq: number | null
    event_type: string
    event_hash: string
    event_timestamp: string
    actor_id: string | null
  }>
  marketplace: {
    active_listings: number
    total_volume: number
  }
}

function mapAdminActionType(actionType: string): DisputeRow["type"] | null {
  const t = actionType.toLowerCase()
  if (t === "compensate_pc" || t === "compensation" || t === "grant_asset" || t === "grant_badge") {
    return "COMPENSATION"
  }
  if (t === "freeze" || t === "unfreeze") return "FREEZE"
  if (t === "ticket_ban" || t === "ban") return "BAN"
  return null
}

export async function getRngRecentRounds(limit = 50): Promise<RngRoundRow[]> {
  const { data: rounds, error } = await supabaseAdmin
    .from("rng_rounds")
    .select("id, user_id, commit_hash, result_hash, status, committed_at, revealed_at, server_seed, client_seed, nonce")
    .order("committed_at", { ascending: false })
    .limit(limit)

  if (error) throw error

  const ids = (rounds ?? []).map((r) => r.id)
  const tierMap: Record<string, string> = {}

  if (ids.length) {
    const { data: drops } = await supabaseAdmin
      .from("user_poxy")
      .select("rng_round_id, poxy_tier")
      .in("rng_round_id", ids)

    for (const drop of drops ?? []) {
      if (drop.rng_round_id && !tierMap[drop.rng_round_id]) {
        tierMap[drop.rng_round_id] = drop.poxy_tier
      }
    }
  }

  return (rounds ?? []).map((round) => {
    const verify = verifyRngRound(round)
    const tierFromDrop = tierMap[round.id] ?? null
    return {
      id: round.id,
      user_id: round.user_id,
      commit_hash: round.commit_hash,
      result_hash: round.result_hash,
      status: round.status,
      committed_at: round.committed_at,
      revealed_at: round.revealed_at,
      result_tier: tierFromDrop ?? (round.result_hash ? tierFromResultHash(round.result_hash) : null),
      display_status: verify.display_status,
      verified: verify.verified,
      fair: verify.fair,
    } satisfies RngRoundRow
  })
}

export async function getRngProof(roundId: string): Promise<RngProof | null> {
  const { data: round, error } = await supabaseAdmin
    .from("rng_rounds")
    .select(
      "id, user_id, commit_hash, result_hash, status, committed_at, revealed_at, client_seed, nonce, server_seed",
    )
    .eq("id", roundId)
    .maybeSingle()

  if (error) throw error
  if (!round) return null

  const verify = verifyRngRound(round)

  const { data: drop } = await supabaseAdmin
    .from("user_poxy")
    .select("poxy_tier")
    .eq("rng_round_id", roundId)
    .maybeSingle()

  return {
    id: round.id,
    user_id: round.user_id,
    commit_hash: round.commit_hash,
    result_hash: round.result_hash,
    status: round.status,
    committed_at: round.committed_at,
    revealed_at: round.revealed_at,
    client_seed: round.client_seed,
    nonce: round.nonce,
    server_seed: round.status === "revealed" ? round.server_seed : null,
    result_tier: drop?.poxy_tier ?? (round.result_hash ? tierFromResultHash(round.result_hash) : null),
    display_status: verify.display_status,
    verified: verify.verified,
    fair: verify.fair,
    commit_matches: verify.commit_matches,
    result_matches: verify.result_matches,
  }
}

export async function getDisputesView(filter?: string): Promise<{ rows: DisputeRow[]; stats: DisputesStats }> {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const monthIso = monthStart.toISOString()

  const [{ data: abuseTickets }, { data: adminActions }] = await Promise.all([
    supabaseAdmin
      .from("support_tickets")
      .select(
        `
        id,
        user_id,
        subject,
        status,
        is_abuse,
        abuse_reason,
        created_at,
        profiles!user_id (username)
      `,
      )
      .eq("is_abuse", true)
      .order("created_at", { ascending: false })
      .limit(200),
    supabaseAdmin
      .from("admin_actions")
      .select(
        `
        id,
        target_user_id,
        action_type,
        payload,
        reason,
        created_at,
        profiles!admin_id (username),
        target_profile:profiles!target_user_id (username)
      `,
      )
      .in("action_type", [
        "compensate_pc",
        "compensation",
        "grant_asset",
        "grant_badge",
        "freeze",
        "unfreeze",
        "ticket_ban",
        "ban",
      ])
      .order("created_at", { ascending: false })
      .limit(200),
  ])

  const rows: DisputeRow[] = []

  for (const ticket of abuseTickets ?? []) {
    const profile = normalizeJoin(ticket.profiles) as { username: string | null } | null
    rows.push({
      id: ticket.id,
      source: "ticket",
      type: "ABUSE",
      player_id: ticket.user_id,
      player_username: profile?.username ?? null,
      amount_or_reason: ticket.abuse_reason || ticket.subject,
      status: ticket.status,
      created_at: ticket.created_at,
      admin_username: null,
      payload: {
        subject: ticket.subject,
        is_abuse: ticket.is_abuse,
        abuse_reason: ticket.abuse_reason,
      },
    })
  }

  for (const action of adminActions ?? []) {
    const mapped = mapAdminActionType(action.action_type)
    if (!mapped) continue

    const adminProfile = normalizeJoin(action.profiles) as { username: string | null } | null
    const targetProfile = normalizeJoin(action.target_profile) as { username: string | null } | null
    const payload = (action.payload as Record<string, unknown>) ?? {}

    let amountOrReason = action.reason
    if (mapped === "COMPENSATION") {
      const amt = payload.amount_added ?? payload.new_balance
      amountOrReason = amt != null ? `${amt} PC — ${action.reason}` : action.reason
    }

    rows.push({
      id: action.id,
      source: "admin_action",
      type: mapped,
      player_id: action.target_user_id ?? "",
      player_username: targetProfile?.username ?? null,
      amount_or_reason: amountOrReason,
      status: action.action_type,
      created_at: action.created_at,
      admin_username: adminProfile?.username ?? null,
      payload,
    })
  }

  rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const filtered =
    filter && filter !== "ALL"
      ? rows.filter((r) => r.type === filter)
      : rows

  const { count: compensationsThisMonth } = await supabaseAdmin
    .from("admin_actions")
    .select("id", { count: "exact", head: true })
    .eq("action_type", "compensate_pc")
    .gte("created_at", monthIso)

  const { data: monthCompensations } = await supabaseAdmin
    .from("admin_actions")
    .select("payload")
    .eq("action_type", "compensate_pc")
    .gte("created_at", monthIso)

  let totalPxGiven = 0
  for (const row of monthCompensations ?? []) {
    const payload = row.payload as { amount_added?: number }
    totalPxGiven += Number(payload.amount_added ?? 0)
  }

  const stats: DisputesStats = {
    compensations_this_month: compensationsThisMonth ?? 0,
    total_px_given_out: totalPxGiven,
    abuse_count: abuseTickets?.length ?? 0,
  }

  return { rows: filtered, stats }
}

export async function getEconomyHealth(): Promise<EconomyHealth> {
  const [
    supplyOverview,
    gen1CapsRes,
    pxCirculationRes,
    burnCountRes,
    purchasesRes,
    ledgerRes,
    activeListingsRes,
    soldVolumeRes,
  ] = await Promise.all([
    getPoxyMetrics(),
    supabaseAdmin.from("gen1_supply_caps").select("poxy_tier, cap, minted").order("poxy_tier"),
    supabaseAdmin.from("profiles").select("px_balance"),
    supabaseAdmin.from("burn_log").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("px_purchases").select("px_amount, bonus_px").eq("status", "completed"),
    supabaseAdmin
      .from("ledger_events")
      .select("id, seq, event_type, event_hash, event_timestamp, actor_id")
      .order("seq", { ascending: false })
      .limit(20),
    supabaseAdmin.from("marketplace").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabaseAdmin.from("marketplace").select("price").eq("status", "sold"),
  ])

  const px_circulation = (pxCirculationRes.data ?? []).reduce((sum, p) => sum + Number(p.px_balance ?? 0), 0)
  const total_px_purchased = (purchasesRes.data ?? []).reduce(
    (sum, p) => sum + Number(p.px_amount ?? 0) + Number(p.bonus_px ?? 0),
    0,
  )
  const total_volume = (soldVolumeRes.data ?? []).reduce((sum, m) => sum + Number(m.price ?? 0), 0)

  return {
    supply_overview: supplyOverview,
    gen1_caps: gen1CapsRes.data ?? [],
    px_circulation,
    total_burn_events: burnCountRes.count ?? 0,
    total_px_purchased,
    recent_ledger: ledgerRes.data ?? [],
    marketplace: {
      active_listings: activeListingsRes.count ?? 0,
      total_volume,
    },
  }
}

export type McuUpdateRead = {
  staff_id: string
  confirmed: boolean
  confirmed_at: string | null
  read_at: string
}

export type McuUpdate = {
  id: string
  type: string
  title: string
  body: string
  is_pinned: boolean
  requires_confirmation: boolean
  published_by: string | null
  created_at: string
  updated_at: string
  author_username: string | null
  mcu_update_reads: McuUpdateRead[]
  confirmed_count: number
  staff_total: number
}

export type StaffProfileRef = {
  id: string
  username: string | null
  email: string
}

export type OsTaskSubtask = {
  id: string
  task_id: string
  title: string
  completed: boolean
  sort_order: number
  completed_by: string | null
  completed_at: string | null
}

export type OsTaskComment = {
  id: string
  task_id: string
  author_id: string | null
  body: string
  created_at: string
  author_username: string | null
}

export type OsTask = {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  department: string | null
  created_by: string | null
  assigned_to: string | null
  due_date: string | null
  created_at: string
  updated_at: string
  assignee_username: string | null
  creator_username: string | null
  os_task_subtasks: OsTaskSubtask[]
  os_task_comments: OsTaskComment[]
  subtask_done: number
  subtask_total: number
  comment_count: number
}

export async function getStaffProfiles(): Promise<StaffProfileRef[]> {
  const staff = await getStaff()
  return staff
    .filter((s) => s.profiles?.id)
    .map((s) => ({
      id: s.profiles!.id,
      username: s.profiles!.username,
      email: s.email,
    }))
}

async function enrichTasks(
  tasks: Array<Record<string, unknown>>,
  usernameMap: Record<string, string>,
): Promise<OsTask[]> {
  return tasks.map((task) => {
    const subtasks = (task.os_task_subtasks as OsTaskSubtask[] | undefined) ?? []
    const comments = (task.os_task_comments as OsTaskComment[] | undefined) ?? []
    const subtask_done = subtasks.filter((s) => s.completed).length

    return {
      id: task.id as string,
      title: task.title as string,
      description: (task.description as string | null) ?? null,
      priority: task.priority as string,
      status: task.status as string,
      department: (task.department as string | null) ?? null,
      created_by: (task.created_by as string | null) ?? null,
      assigned_to: (task.assigned_to as string | null) ?? null,
      due_date: (task.due_date as string | null) ?? null,
      created_at: task.created_at as string,
      updated_at: task.updated_at as string,
      assignee_username: task.assigned_to ? (usernameMap[task.assigned_to as string] ?? null) : null,
      creator_username: task.created_by ? (usernameMap[task.created_by as string] ?? null) : null,
      os_task_subtasks: subtasks,
      os_task_comments: comments.map((c) => ({
        ...c,
        author_username: c.author_id ? (usernameMap[c.author_id] ?? null) : null,
      })),
      subtask_done,
      subtask_total: subtasks.length,
      comment_count: comments.length,
    }
  })
}

async function buildUsernameMap(ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {}
  const { data } = await supabaseAdmin.from("profiles").select("id, username").in("id", ids)
  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    if (row.username) map[row.id] = row.username
  }
  return map
}

export async function getMcuUpdates(typeFilter?: string | null): Promise<McuUpdate[]> {
  const [staffProfiles, updatesQuery] = await Promise.all([
    getStaffProfiles(),
    (() => {
      let q = supabaseAdmin
        .from("mcu_updates")
        .select(
          `
          id, type, title, body, is_pinned, requires_confirmation, published_by, created_at, updated_at,
          mcu_update_reads (staff_id, confirmed, confirmed_at, read_at)
        `,
        )
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
      if (typeFilter) q = q.eq("type", typeFilter)
      return q
    })(),
  ])

  const { data: updates, error } = await updatesQuery
  if (error) throw error

  const authorIds = [...new Set((updates ?? []).map((u) => u.published_by).filter(Boolean))] as string[]
  const authorMap = await buildUsernameMap(authorIds)
  const staffTotal = staffProfiles.length

  return (updates ?? []).map((update) => {
    const reads = (update.mcu_update_reads ?? []) as McuUpdateRead[]
    return {
      id: update.id,
      type: update.type,
      title: update.title,
      body: update.body,
      is_pinned: update.is_pinned,
      requires_confirmation: update.requires_confirmation,
      published_by: update.published_by,
      created_at: update.created_at,
      updated_at: update.updated_at,
      author_username: update.published_by ? (authorMap[update.published_by] ?? null) : null,
      mcu_update_reads: reads,
      confirmed_count: reads.filter((r) => r.confirmed).length,
      staff_total: staffTotal,
    }
  })
}

export async function getOsTasks(options?: {
  assignedTo?: string
  status?: string
  priority?: string
  department?: string
}): Promise<OsTask[]> {
  let query = supabaseAdmin
    .from("os_tasks")
    .select(
      `
      *,
      os_task_subtasks (id, task_id, title, completed, sort_order, completed_by, completed_at),
      os_task_comments (id, task_id, author_id, body, created_at)
    `,
    )
    .order("updated_at", { ascending: false })

  if (options?.assignedTo) query = query.eq("assigned_to", options.assignedTo)
  if (options?.status && options.status !== "all") query = query.eq("status", options.status)
  if (options?.priority && options.priority !== "all") query = query.eq("priority", options.priority)
  if (options?.department && options.department !== "all") query = query.eq("department", options.department)

  const { data, error } = await query
  if (error) throw error

  const ids = new Set<string>()
  for (const task of data ?? []) {
    if (task.created_by) ids.add(task.created_by)
    if (task.assigned_to) ids.add(task.assigned_to)
    for (const c of task.os_task_comments ?? []) {
      if (c.author_id) ids.add(c.author_id)
    }
  }

  const usernameMap = await buildUsernameMap([...ids])
  return enrichTasks(data ?? [], usernameMap)
}

export async function getOsTaskById(taskId: string): Promise<OsTask | null> {
  const { data, error } = await supabaseAdmin
    .from("os_tasks")
    .select(
      `
      *,
      os_task_subtasks (id, task_id, title, completed, sort_order, completed_by, completed_at),
      os_task_comments (id, task_id, author_id, body, created_at)
    `,
    )
    .eq("id", taskId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const ids = new Set<string>()
  if (data.created_by) ids.add(data.created_by)
  if (data.assigned_to) ids.add(data.assigned_to)
  for (const c of data.os_task_comments ?? []) {
    if (c.author_id) ids.add(c.author_id)
  }

  const usernameMap = await buildUsernameMap([...ids])
  const [task] = await enrichTasks([data], usernameMap)
  return task ?? null
}

export type OsChannelRow = {
  id: string
  name: string
  type: string
  department: string | null
  created_by: string | null
  created_at: string
}

export type OsMessageRow = {
  id: string
  channel_id: string
  sender_id: string | null
  body: string | null
  attachment_url: string | null
  attachment_type: string | null
  attachment_ref: string | null
  is_system: boolean
  created_at: string
  sender_username?: string | null
  sender_avatar?: string | null
}

export type OsNoteRow = {
  id: string
  staff_id: string
  title: string
  body: string
  tags: string[]
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export type SystemHealthLogRow = {
  id: string
  checked_at: string
  supabase_latency_ms: number | null
  edge_functions_status: string | null
  storage_used_mb: number | null
  active_connections: number | null
  rpc_calls_today: number | null
  error_rate_1h: number | null
  notes: string | null
}

export type TeamMemberRow = {
  email: string
  role: string
  profile_id: string | null
  is_active: boolean
  username?: string | null
  avatar_url?: string | null
}

export async function computeChannelUnread(
  userId: string,
  channelIds: string[],
): Promise<Record<string, number>> {
  if (!channelIds.length) return {}

  const [{ data: reads }, { data: msgs }] = await Promise.all([
    supabaseAdmin
      .from("os_message_reads")
      .select("channel_id, last_read_at")
      .eq("staff_id", userId)
      .in("channel_id", channelIds),
    supabaseAdmin
      .from("os_messages")
      .select("channel_id, sender_id, created_at")
      .in("channel_id", channelIds)
      .neq("sender_id", userId),
  ])

  const readMap: Record<string, string> = {}
  for (const r of reads ?? []) {
    readMap[r.channel_id] = r.last_read_at
  }

  const unread: Record<string, number> = {}
  for (const m of msgs ?? []) {
    const lastRead = readMap[m.channel_id]
    if (!lastRead || new Date(m.created_at) > new Date(lastRead)) {
      unread[m.channel_id] = (unread[m.channel_id] ?? 0) + 1
    }
  }
  return unread
}

export async function getMemberCounts(channelIds: string[]): Promise<Record<string, number>> {
  if (!channelIds.length) return {}
  const { data, error } = await supabaseAdmin
    .from("os_channel_members")
    .select("channel_id")
    .in("channel_id", channelIds)

  if (error) throw error

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    counts[row.channel_id] = (counts[row.channel_id] ?? 0) + 1
  }
  return counts
}

export async function enrichOsMessages(messages: OsMessageRow[]): Promise<OsMessageRow[]> {
  const senderIds = [...new Set(messages.map((m) => m.sender_id).filter(Boolean))] as string[]
  if (!senderIds.length) return messages

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", senderIds)

  const map: Record<string, { username: string | null; avatar_url: string | null }> = {}
  for (const p of profiles ?? []) {
    map[p.id] = { username: p.username, avatar_url: p.avatar_url }
  }

  return messages.map((m) => ({
    ...m,
    sender_username: m.sender_id ? (map[m.sender_id]?.username ?? null) : null,
    sender_avatar: m.sender_id ? (map[m.sender_id]?.avatar_url ?? null) : null,
  }))
}

export async function getRecentHealthLogs(limit = 10): Promise<SystemHealthLogRow[]> {
  const { data, error } = await supabaseAdmin
    .from("system_health_log")
    .select("*")
    .order("checked_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export type MktCampaign = {
  id: string
  name: string
  description: string | null
  status: string
  platform: string[]
  start_date: string | null
  end_date: string | null
  goal: string | null
  budget_pc: number
  result_notes: string | null
  created_by: string | null
  created_at: string
}

export type MktCalendarPost = {
  id: string
  title: string
  body: string | null
  platform: string
  status: string
  scheduled_at: string | null
  published_at: string | null
  asset_url: string | null
  campaign_id: string | null
  created_by: string | null
  created_at: string
}

export type MktAsset = {
  id: string
  name: string
  type: string
  url: string
  tags: string[]
  version: string
  approved: boolean
  approved_by: string | null
  uploaded_by: string | null
  created_at: string
}

export type MktInfluencer = {
  id: string
  name: string
  platform: string
  handle: string | null
  followers_count: number | null
  niche: string | null
  status: string
  notes: string | null
  deal_terms: string | null
  result_notes: string | null
  created_by: string | null
  created_at: string
}

export async function getMktCampaigns(status?: string): Promise<MktCampaign[]> {
  let query = supabaseAdmin.from("mkt_campaigns").select("*").order("created_at", { ascending: false })
  if (status && status !== "all") query = query.eq("status", status)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getMktCalendarPosts(year: number, month: number): Promise<MktCalendarPost[]> {
  const start = new Date(year, month - 1, 1).toISOString()
  const end = new Date(year, month, 1).toISOString()
  const { data, error } = await supabaseAdmin
    .from("mkt_content_calendar")
    .select("*")
    .gte("scheduled_at", start)
    .lt("scheduled_at", end)
    .order("scheduled_at", { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getMktAssets(): Promise<MktAsset[]> {
  const { data, error } = await supabaseAdmin
    .from("mkt_assets")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getMktInfluencers(status?: string): Promise<MktInfluencer[]> {
  let query = supabaseAdmin.from("mkt_influencers").select("*").order("created_at", { ascending: false })
  if (status && status !== "all") query = query.eq("status", status)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export type OsChangelogEntry = {
  id: string
  version: string
  category: string
  title: string
  description: string
  affects_gameplay: boolean
  published_by: string | null
  created_at: string
  updated_at: string
  author_username?: string | null
}

export async function getOsChangelog(options?: {
  category?: string
  gameplayOnly?: boolean
}): Promise<OsChangelogEntry[]> {
  let query = supabaseAdmin.from("os_changelog").select("*").order("created_at", { ascending: false })

  if (options?.category && options.category !== "all") {
    query = query.eq("category", options.category)
  }
  if (options?.gameplayOnly) {
    query = query.eq("affects_gameplay", true)
  }

  const { data, error } = await query
  if (error) throw error

  const authorIds = [...new Set((data ?? []).map((e) => e.published_by).filter(Boolean))] as string[]
  const authorMap = await buildUsernameMap(authorIds)

  return (data ?? []).map((entry) => ({
    ...entry,
    author_username: entry.published_by ? (authorMap[entry.published_by] ?? null) : null,
  }))
}

export type McuDashboardStats = {
  username: string | null
  openTickets: number
  myTasks: number
  unreadMessages: number
}

export type TelemetryStats = {
  profilesCount: number
  userPoxyCount: number
}

export type AlertRow = {
  alert_key: string
  severity: string
  alert_type: string
  user_id: string | null
  username: string | null
  message: string
  detail: Record<string, unknown>
}

export type UserMatrixRow = {
  id: string
  username: string | null
  email: string | null
  px_balance: number
  xp_level: number
  created_at: string
}

export type NewsPostRow = {
  id: number
  title: string
  content: string
  author_username: string | null
  created_at: string
  published: boolean
}

export async function getMcuDashboardStats(userId: string): Promise<McuDashboardStats> {
  const [{ data: profile }, { count: openTickets }, { count: myTasks }, unreadTotal] = await Promise.all([
    supabaseAdmin.from("profiles").select("username").eq("id", userId).maybeSingle(),
    supabaseAdmin
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]),
    supabaseAdmin
      .from("os_tasks")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", userId)
      .neq("status", "done"),
    (async () => {
      const { data: memberRows } = await supabaseAdmin
        .from("os_channel_members")
        .select("channel_id")
        .eq("staff_id", userId)
      const channelIds = (memberRows ?? []).map((r) => r.channel_id)
      if (!channelIds.length) return 0
      const unreadMap = await computeChannelUnread(userId, channelIds)
      return Object.values(unreadMap).reduce((sum, n) => sum + n, 0)
    })(),
  ])

  return {
    username: profile?.username ?? null,
    openTickets: openTickets ?? 0,
    myTasks: myTasks ?? 0,
    unreadMessages: unreadTotal,
  }
}

export async function getTelemetryStats(): Promise<TelemetryStats> {
  const [{ count: profilesCount }, { count: userPoxyCount }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("user_poxy").select("id", { count: "exact", head: true }),
  ])

  return {
    profilesCount: profilesCount ?? 0,
    userPoxyCount: userPoxyCount ?? 0,
  }
}

export async function getActiveAlerts(): Promise<AlertRow[]> {
  const { error: tableError } = await supabaseAdmin.from("alert_system").select("id").limit(1)
  if (!tableError) {
    const { data, error } = await supabaseAdmin
      .from("alert_system")
      .select("alert_key, severity, alert_type, user_id, username, message, detail")
      .order("created_at", { ascending: false })
      .limit(100)
    if (!error && data?.length) {
      return data.map((row) => ({
        ...row,
        detail: (row.detail as Record<string, unknown>) ?? {},
      }))
    }
  }

  const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
  const checks = await Promise.allSettled([
    supabaseAdmin.rpc("check_case_spam", { p_threshold: 5, p_since: oneHourAgo }),
    supabaseAdmin.rpc("check_burn_spike", { p_threshold: 20, p_window_minutes: 30 }),
    supabaseAdmin.rpc("check_new_account_otc", { p_threshold: 3 }),
    supabaseAdmin.rpc("check_stuck_mint_rounds", { p_threshold: 5 }),
    supabaseAdmin.rpc("check_large_transfers", { p_threshold: 5000, p_since: oneHourAgo }),
  ])

  const alerts: AlertRow[] = []
  for (const result of checks) {
    if (result.status === "fulfilled" && result.value.data?.length) {
      for (const row of result.value.data as AlertRow[]) {
        alerts.push({
          ...row,
          detail: (row.detail as Record<string, unknown>) ?? {},
        })
      }
    }
  }

  return alerts
}

export async function getUserMatrix(search?: string): Promise<UserMatrixRow[]> {
  let query = supabaseAdmin
    .from("profiles")
    .select("id, username, email, px_balance, xp_level, created_at")
    .order("created_at", { ascending: false })
    .limit(500)

  const q = search?.trim()
  if (q) {
    query = query.or(`username.ilike.%${q}%,email.ilike.%${q}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getNewsPosts(): Promise<NewsPostRow[]> {
  const { data, error } = await supabaseAdmin
    .from("news_posts")
    .select("id, title, content, author_username, created_at")
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) throw error

  return (data ?? []).map((row) => ({
    ...row,
    published: !row.title.startsWith("[DRAFT] "),
  }))
}

export async function createNewsPost(input: {
  authorId: string
  authorUsername: string
  title: string
  body: string
  published: boolean
}): Promise<NewsPostRow> {
  const title = input.published ? input.title.trim() : `[DRAFT] ${input.title.trim()}`

  const { data, error } = await supabaseAdmin
    .from("news_posts")
    .insert({
      title,
      content: input.body.trim(),
      author_id: input.authorId,
      author_username: input.authorUsername,
    })
    .select("id, title, content, author_username, created_at")
    .single()

  if (error) throw error

  return {
    ...data,
    published: input.published,
  }
}

export type QuickReplyRow = {
  id: string
  title: string
  body: string
  category: string
  created_by: string | null
  created_at: string
}

export type FaqRow = {
  id: string
  question: string
  answer: string
  category: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export type AutoMessageRow = {
  id: string
  trigger: string
  body: string
  is_active: boolean
}

export async function getQuickReplies(category?: string): Promise<QuickReplyRow[]> {
  let query = supabaseAdmin
    .from("support_quick_replies")
    .select("id, title, body, category, created_by, created_at")
    .order("created_at", { ascending: true })

  if (category && category !== "all") {
    query = query.eq("category", category)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function createQuickReply(input: {
  title: string
  body: string
  category: string
  createdBy: string | null
}): Promise<QuickReplyRow> {
  const { data, error } = await supabaseAdmin
    .from("support_quick_replies")
    .insert({
      title: input.title,
      body: input.body,
      category: input.category,
      created_by: input.createdBy,
    })
    .select("id, title, body, category, created_by, created_at")
    .single()

  if (error) throw error
  return data
}

export async function updateQuickReply(
  id: string,
  input: { title?: string; body?: string; category?: string },
): Promise<QuickReplyRow> {
  const { data, error } = await supabaseAdmin
    .from("support_quick_replies")
    .update(input)
    .eq("id", id)
    .select("id, title, body, category, created_by, created_at")
    .single()

  if (error) throw error
  return data
}

export async function deleteQuickReply(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("support_quick_replies").delete().eq("id", id)
  if (error) throw error
}

export async function getFaqEntries(): Promise<FaqRow[]> {
  const { data, error } = await supabaseAdmin
    .from("support_faq")
    .select("id, question, answer, category, sort_order, is_active, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createFaqEntry(input: {
  question: string
  answer: string
  category: string
  is_active: boolean
  sort_order?: number
}): Promise<FaqRow> {
  let sortOrder = input.sort_order
  if (sortOrder == null) {
    const { count } = await supabaseAdmin
      .from("support_faq")
      .select("id", { count: "exact", head: true })
    sortOrder = (count ?? 0) + 1
  }

  const { data, error } = await supabaseAdmin
    .from("support_faq")
    .insert({
      question: input.question,
      answer: input.answer,
      category: input.category,
      is_active: input.is_active,
      sort_order: sortOrder,
    })
    .select("id, question, answer, category, sort_order, is_active, created_at")
    .single()

  if (error) throw error
  return data
}

export async function updateFaqEntry(
  id: string,
  input: Partial<Pick<FaqRow, "question" | "answer" | "category" | "is_active" | "sort_order">>,
): Promise<FaqRow> {
  const { data, error } = await supabaseAdmin
    .from("support_faq")
    .update(input)
    .eq("id", id)
    .select("id, question, answer, category, sort_order, is_active, created_at")
    .single()

  if (error) throw error
  return data
}

export async function deleteFaqEntry(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("support_faq").delete().eq("id", id)
  if (error) throw error
}

export async function swapFaqOrder(id: string, direction: "up" | "down"): Promise<FaqRow[]> {
  const entries = await getFaqEntries()
  const index = entries.findIndex((e) => e.id === id)
  if (index < 0) throw new Error("FAQ entry not found")

  const swapIndex = direction === "up" ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= entries.length) return entries

  const current = entries[index]
  const neighbor = entries[swapIndex]

  await Promise.all([
    supabaseAdmin.from("support_faq").update({ sort_order: neighbor.sort_order }).eq("id", current.id),
    supabaseAdmin.from("support_faq").update({ sort_order: current.sort_order }).eq("id", neighbor.id),
  ])

  return getFaqEntries()
}

export async function getAutoMessages(): Promise<AutoMessageRow[]> {
  const { data, error } = await supabaseAdmin
    .from("support_auto_messages")
    .select("id, trigger, body, is_active")
    .order("trigger")

  if (error) throw error
  return data ?? []
}

export async function updateAutoMessage(
  id: string,
  input: { body?: string; is_active?: boolean },
): Promise<AutoMessageRow> {
  const { data, error } = await supabaseAdmin
    .from("support_auto_messages")
    .update(input)
    .eq("id", id)
    .select("id, trigger, body, is_active")
    .single()

  if (error) throw error
  return data
}

export async function upsertAutoMessageByTrigger(input: {
  trigger: string
  body: string
  is_active?: boolean
}): Promise<AutoMessageRow> {
  const { data, error } = await supabaseAdmin
    .from("support_auto_messages")
    .upsert(
      {
        trigger: input.trigger,
        body: input.body,
        is_active: input.is_active ?? true,
      },
      { onConflict: "trigger" },
    )
    .select("id, trigger, body, is_active")
    .single()

  if (error) throw error
  return data
}
