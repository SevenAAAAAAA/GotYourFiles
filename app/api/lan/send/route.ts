export const runtime = "nodejs";

type SendBody = {
  host: string;
  port: number;
  msg: string;
  from?: string;
  authToken?: string;
};

const LAN_AUTH_TOKEN = process.env.LAN_AUTH_TOKEN || "lan-chat-token-2026";

function normalizeHost(host: string) {
  return host.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

function isValidIpv4(host: string) {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return false;
    const n = Number(p);
    if (!Number.isInteger(n) || n < 0 || n > 255) return false;
  }
  return true;
}

function toUrl(host: string, port: number) {
  const h = normalizeHost(host);
  return `http://${h}:${port}/api/lan/receive`;
}

export async function POST(req: Request) {
  let body: Partial<SendBody> = {};
  try {
    body = await req.json();
  } catch {}
  const host = typeof body.host === "string" ? body.host : "";
  const port =
    typeof body.port === "number"
      ? body.port
      : Number.parseInt(String(body.port ?? ""), 10);
  const msg = typeof body.msg === "string" ? body.msg : "";
  const from = typeof body.from === "string" && body.from.trim() ? body.from.trim() : "gotyourfiles";
  const authToken =
    typeof body.authToken === "string" && body.authToken.trim()
      ? body.authToken.trim()
      : LAN_AUTH_TOKEN;
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost || !Number.isFinite(port) || !msg) {
    return new Response(
      JSON.stringify({ ok: false, error: "invalid_parameters" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(normalizedHost) && !isValidIpv4(normalizedHost)) {
    return new Response(
      JSON.stringify({ ok: false, error: "invalid_host_format", host: normalizedHost }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
  const url = toUrl(normalizedHost, port);
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = new Date().toISOString();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 4000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        from,
        text: msg,
        messageId,
        timestamp,
      }),
      signal: ac.signal,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "remote_request_failed",
          remoteStatus: res.status,
          remoteData: data,
          url,
        }),
        { status: 502, headers: { "content-type": "application/json" } },
      );
    }
    if (data && typeof data === "object" && "success" in (data as Record<string, unknown>) && (data as Record<string, unknown>).success === false) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "remote_rejected",
          remoteStatus: res.status,
          remoteData: data,
          url,
        }),
        { status: 502, headers: { "content-type": "application/json" } },
      );
    }
    return Response.json({ ok: true, url, status: res.status, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const causeCode =
      e &&
      typeof e === "object" &&
      "cause" in e &&
      (e as { cause?: unknown }).cause &&
      typeof (e as { cause?: { code?: unknown } }).cause?.code === "string"
        ? String((e as { cause?: { code?: string } }).cause?.code)
        : "";
    const hint =
      causeCode === "ECONNREFUSED"
        ? "target_refused_connection"
        : causeCode === "ETIMEDOUT"
          ? "target_timeout"
          : causeCode === "EHOSTUNREACH" || causeCode === "ENETUNREACH"
            ? "target_unreachable"
            : "unknown_network_error";
    return new Response(
      JSON.stringify({
        ok: false,
        error: "fetch_failed",
        detail: message,
        causeCode,
        hint,
        host: normalizedHost,
        port,
        url,
      }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  } finally {
    clearTimeout(timer);
  }
}
