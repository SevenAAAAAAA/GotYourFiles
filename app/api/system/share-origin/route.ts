import os from "node:os";

export const runtime = "nodejs";

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

function isPrivateIPv4(ip: string) {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  const nums = parts.map((part) => Number(part));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = nums;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function detectLanIPv4() {
  const nets = os.networkInterfaces();
  let fallback = "";
  for (const infos of Object.values(nets)) {
    if (!infos) continue;
    for (const info of infos) {
      if (info.family !== "IPv4" || info.internal) continue;
      if (isPrivateIPv4(info.address)) return info.address;
      if (!fallback) fallback = info.address;
    }
  }
  return fallback;
}

export async function GET(req: Request) {
  const reqUrl = new URL(req.url);
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const protocol = (forwardedProto ? forwardedProto.split(",")[0]?.trim() : reqUrl.protocol.replace(":", "")) || "http";
  const rawHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? reqUrl.host;

  let hostname = "";
  let port = "";
  try {
    const parsed = new URL(`${protocol}://${rawHost}`);
    hostname = parsed.hostname;
    port = parsed.port;
  } catch {
    hostname = rawHost;
  }

  let outputHost = rawHost;
  if (isLocalHostname(hostname)) {
    const lanIp = detectLanIPv4();
    if (lanIp) outputHost = port ? `${lanIp}:${port}` : lanIp;
  }

  return Response.json({ ok: true, origin: `${protocol}://${outputHost}` });
}
