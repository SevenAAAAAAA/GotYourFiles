import { getProjectConfig, setProjectConfig, type ProjectDataConfig } from "@/lib/projectConfigLoader";

function isLocalhost(request: Request): boolean {
  const host = request.headers.get("host") ?? "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("[::1]");
}

export async function GET(request: Request) {
  if (!isLocalhost(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const config = getProjectConfig();
  return Response.json(config);
}

export async function POST(request: Request) {
  if (!isLocalhost(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = (await request.json()) as ProjectDataConfig;
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid config data" }, { status: 400 });
    }
    if (!Array.isArray(body.projectsZh) || !Array.isArray(body.projectsEn)) {
      return Response.json({ error: "projectsZh and projectsEn must be arrays" }, { status: 400 });
    }
    setProjectConfig(body);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
