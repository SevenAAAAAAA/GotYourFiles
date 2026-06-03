export const runtime = "nodejs";

function now() {
  return new Date().toISOString();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const msg = searchParams.get("msg") ?? "";
  const from = searchParams.get("from") ?? "";
  console.log(`[lan/receive][GET] ${now()} from=${from} msg=${msg}`);
  const { addMessage } = await import("../../../../lib/lanStore");
  addMessage("GET", msg, from);
  return Response.json({ ok: true, method: "GET", received: msg, from });
}

export async function POST(req: Request) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {}
  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const msgRaw = typeof obj["msg"] === "string" ? (obj["msg"] as string) : "";
  const textRaw = typeof obj["text"] === "string" ? (obj["text"] as string) : "";
  const msg = msgRaw || textRaw;
  const from = typeof obj["from"] === "string" ? (obj["from"] as string) : "";
  const messageId = typeof obj["messageId"] === "string" ? (obj["messageId"] as string) : "";
  const timestamp = typeof obj["timestamp"] === "string" ? (obj["timestamp"] as string) : "";
  if (!msg || !from) {
    return new Response(
      JSON.stringify({ ok: false, error: "invalid_parameters" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }
  console.log(`[lan/receive][POST] ${now()} from=${from} msg=${msg}`);
  const { addMessage } = await import("../../../../lib/lanStore");
  addMessage("POST", msg, from);
  return Response.json({ ok: true, method: "POST", received: msg, from, messageId, timestamp });
}
