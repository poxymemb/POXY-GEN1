// =============================================================================
// notify_telegram — staff Telegram alerts for support ticket events.
// Invoked from Postgres via pg_net (x-internal-secret header).
// Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, POXY_NOTIFY_SECRET
// =============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const MCU_URL = "https://poxy-gens.vercel.app/_poxy-staff-mcu";

type NotifyType = "new_ticket" | "new_message";

interface NotifyPayload {
  type: NotifyType;
  ticket_id: string;
  ticket_id_short: string;
  username: string;
  subject: string;
  message_preview?: string;
  created_at: string;
}

function ensureUsername(raw: string): string {
  const u = (raw || "").trim();
  if (!u) return "@player";
  return u.startsWith("@") ? u : `@${u}`;
}

function formatNewTicket(p: NotifyPayload): string {
  const username = ensureUsername(p.username);
  return [
    "🎫 Новый тикет",
    `👤 ${username}`,
    `📝 ${p.subject}`,
    `🕐 ${p.created_at}`,
    `🔗 ${MCU_URL}`,
  ].join("\n");
}

function formatNewMessage(p: NotifyPayload): string {
  const username = ensureUsername(p.username);
  const preview = (p.message_preview ?? "").trim() || "—";
  return [
    "💬 Новое сообщение от игрока",
    `👤 ${username}`,
    `📝 "${preview}"`,
    `🎫 Тикет: ${p.subject}`,
    `🔗 ${MCU_URL}`,
  ].join("\n");
}

function validatePayload(body: NotifyPayload): string | null {
  if (!body?.type || (body.type !== "new_ticket" && body.type !== "new_message")) {
    return "type must be new_ticket or new_message";
  }
  if (!body.ticket_id) return "ticket_id required";
  if (!body.ticket_id_short) return "ticket_id_short required";
  if (!body.username) return "username required";
  if (!body.subject) return "subject required";
  if (!body.created_at) return "created_at required";
  if (body.type === "new_message" && body.message_preview == null) {
    return "message_preview required for new_message";
  }
  return null;
}

async function sendTelegram(text: string): Promise<void> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!token || !chatId) {
    throw new Error("Telegram not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)");
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Telegram API ${res.status}: ${detail}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const expected = Deno.env.get("POXY_NOTIFY_SECRET");
  const provided = req.headers.get("x-internal-secret");
  if (!expected || provided !== expected) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  try {
    const body = (await req.json()) as NotifyPayload;
    const err = validatePayload(body);
    if (err) return json({ ok: false, error: err }, 400);

    const text = body.type === "new_ticket"
      ? formatNewTicket(body)
      : formatNewMessage(body);

    await sendTelegram(text);
    return json({ ok: true });
  } catch (e) {
    console.error("notify_telegram:", e);
    return json({ ok: false, error: String(e?.message ?? e) }, 500);
  }
});
