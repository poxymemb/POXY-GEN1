import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getRecentHealthLogs } from "@/lib/queries"
import { requireStaffSession } from "@/lib/mcu-auth"

export async function GET() {
  try {
    await requireStaffSession()
    const recentLogs = await getRecentHealthLogs(10)
    return NextResponse.json({ recentLogs })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load system health"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const { supabase } = await requireStaffSession()
    const body = (await request.json().catch(() => ({}))) as {
      realtimeConnections?: number
    }

    const realtimeCount = Math.max(body.realtimeConnections ?? 1, 1)
    const sessionErrors: string[] = []
    const checkedAt = new Date()

    const dbStart = Date.now()
    const { error: dbError } = await supabaseAdmin.from("profiles").select("id").limit(1)
    const supabaseLatencyMs = Date.now() - dbStart

    if (dbError) sessionErrors.push(`Supabase DB: ${dbError.message}`)

    let vercelStatus: "online" | "offline" = "online"
    let vercelLatencyMs = 0
    try {
      const origin = new URL(request.url).origin
      const vercelStart = Date.now()
      const res = await fetch(`${origin}/api/health`, { cache: "no-store" })
      vercelLatencyMs = Date.now() - vercelStart
      if (!res.ok) {
        vercelStatus = "offline"
        sessionErrors.push(`Vercel: HTTP ${res.status}`)
      }
    } catch (err) {
      vercelStatus = "offline"
      sessionErrors.push(`Vercel: ${err instanceof Error ? err.message : "Unreachable"}`)
    }

    let storageBuckets: Array<{ id: string; name: string; public: boolean }> = []
    let storageUsedMb = 0
    try {
      const { data: buckets, error: storageError } = await supabaseAdmin.storage.listBuckets()
      if (storageError) {
        sessionErrors.push(`Storage: ${storageError.message}`)
      } else {
        storageBuckets = (buckets ?? []).map((b) => ({
          id: b.id,
          name: b.name,
          public: b.public,
        }))
        storageUsedMb = storageBuckets.length
      }
    } catch (err) {
      sessionErrors.push(`Storage: ${err instanceof Error ? err.message : "Unavailable"}`)
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    let rpcCallsToday = 0
    let errorRate1h = 0

    try {
      const { count } = await supabaseAdmin
        .from("system_health_log")
        .select("*", { count: "exact", head: true })
        .gte("checked_at", todayStart.toISOString())
      if (count != null) rpcCallsToday = count + 1
    } catch {
      rpcCallsToday = 1
    }

    const hourAgo = new Date(Date.now() - 3_600_000).toISOString()
    try {
      const { data: hourRows } = await supabaseAdmin
        .from("system_health_log")
        .select("notes")
        .gte("checked_at", hourAgo)
        .limit(60)

      const rows = hourRows ?? []
      if (rows.length) {
        const errs = rows.filter((r) => r.notes).length
        errorRate1h = +(errs / rows.length).toFixed(3)
      }
    } catch {
      /* ignore */
    }

    const notes = sessionErrors.length ? sessionErrors.join("; ") : null

    const { data: logEntry, error: logError } = await supabase.from("system_health_log").insert({
      supabase_latency_ms: supabaseLatencyMs,
      edge_functions_status: dbError ? "offline" : "online",
      storage_used_mb: storageUsedMb,
      active_connections: realtimeCount,
      rpc_calls_today: rpcCallsToday,
      error_rate_1h: errorRate1h,
      notes,
    }).select("*").single()

    if (logError) {
      sessionErrors.push(`Health log insert: ${logError.message}`)
    }

    const recentLogs = await getRecentHealthLogs(10)

    return NextResponse.json({
      checkedAt: checkedAt.toISOString(),
      supabase: {
        status: dbError ? "offline" : "online",
        latencyMs: supabaseLatencyMs,
      },
      vercel: {
        status: vercelStatus,
        latencyMs: vercelLatencyMs,
      },
      realtime: {
        status: "online",
        connections: realtimeCount,
      },
      storage: {
        buckets: storageBuckets,
        bucketCount: storageBuckets.length,
      },
      metrics: {
        rpcCallsToday,
        errorRate1h,
      },
      errors: sessionErrors,
      logEntry: logEntry ?? null,
      recentLogs,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Health check failed"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
