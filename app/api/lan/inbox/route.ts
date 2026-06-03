export const runtime = "nodejs";

export async function GET() {
  const { listMessages, getAutoDownloadedIds } = await import("../../../../lib/lanStore");
  const messages = listMessages();
  const autoDownloadedIds = getAutoDownloadedIds();
  return Response.json({ ok: true, messages, autoDownloadedIds });
}

export async function POST(request: Request) {
  const { tryReserveAutoDownload } = await import("../../../../lib/lanStore");
  try {
    const body = (await request.json().catch(() => null)) as { action?: string; messageId?: string; clientId?: string } | null;
    if (body?.action === "try-reserve-download" && typeof body.messageId === "string") {
      const result = tryReserveAutoDownload(body.messageId, body.clientId);
      return Response.json({ ok: true, ...result });
    }
    return Response.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE() {
  const { clearMessages } = await import("../../../../lib/lanStore");
  clearMessages();
  return Response.json({ ok: true });
}
