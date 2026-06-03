export const runtime = "nodejs";

function encodeSsePayload(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const { subscribeLanEvents } = await import("../../../../lib/lanStore");
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(encodeSsePayload({ type: "ready", ts: Date.now() })));
      const unsubscribe = subscribeLanEvents((event) => {
        controller.enqueue(encoder.encode(encodeSsePayload(event)));
      });
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`event: ping\ndata: ${Date.now()}\n\n`));
      }, 15000);
      const abortHandler = () => {
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      };
      request.signal.addEventListener("abort", abortHandler, { once: true });
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
