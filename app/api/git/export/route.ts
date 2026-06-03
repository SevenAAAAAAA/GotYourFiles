import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { appendFile } from "node:fs/promises";
import path from "node:path";
import { PassThrough } from "node:stream";
import { Readable } from "node:stream";
import { getProjectsEn, getProjectsZh } from "@/lib/serverData";
import { tmpdir } from "node:os";

const EXPORT_TIMEOUT_MS = Number(process.env.GIT_EXPORT_TIMEOUT_MS ?? "60000");
const EXPORT_LOG_FILE = process.env.GIT_EXPORT_LOG_FILE ?? path.join(process.cwd(), "git-export-events.log");

function getProjectById(id: string) {
  return getProjectsZh().find((p) => p.id === id) ?? getProjectsEn().find((p) => p.id === id);
}

function normalizeRelativePath(raw: string) {
  const normalized = path.posix
    .normalize(raw.replaceAll("\\", "/"))
    .replace(/^\/+/, "");
  if (normalized === "." || normalized.startsWith("..")) {
    return "";
  }
  return normalized;
}

function resolveRepositoryPath(projectLink: string, rawRelative: string) {
  const rootPath = path.resolve(projectLink);
  const safeRelative = normalizeRelativePath(rawRelative);
  const targetPath = path.resolve(rootPath, safeRelative);
  const isInsideRoot = targetPath === rootPath || targetPath.startsWith(`${rootPath}${path.sep}`);
  return isInsideRoot ? targetPath : rootPath;
}

function execGit(args: string[], cwd: string, timeoutMs = EXPORT_TIMEOUT_MS): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Git export timed out"));
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const errMsg = Buffer.concat(stderrChunks).toString("utf8").trim();
        reject(new Error(errMsg || `Git exited with code ${code}`));
        return;
      }
      resolve(Buffer.concat(stdoutChunks).toString("utf8").trim());
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function getClientIp(request: Request) {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

async function writeExportLog(params: {
  request: Request;
  projectId: string;
  commitCount: number;
  baseRef: string;
  status: "started" | "failed";
}) {
  const logLine = `${JSON.stringify({
    timestamp: new Date().toISOString(),
    ip: getClientIp(params.request),
    userAgent: params.request.headers.get("user-agent") || "",
    projectId: params.projectId,
    commitCount: params.commitCount,
    baseRef: params.baseRef,
    status: params.status,
  })}\n`;
  try {
    await appendFile(EXPORT_LOG_FILE, logLine, "utf8");
  } catch {}
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const rawCommits = searchParams.get("commits") ?? "";
  const base = searchParams.get("base")?.trim() ?? "";
  const rawRelative = searchParams.get("p") ?? "";

  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  const commitHashes = rawCommits
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);

  if (commitHashes.length === 0) {
    return new Response("Missing commits", { status: 400 });
  }

  const project = getProjectById(id);
  if (!project) {
    return new Response("Project not found", { status: 404 });
  }

  const cwd = resolveRepositoryPath(project.link, rawRelative);

  await writeExportLog({
    request,
    projectId: id,
    commitCount: commitHashes.length,
    baseRef: base,
    status: "started",
  });

  let tmpDir = "";
  try {
    tmpDir = mkdtempSync(path.join(tmpdir(), "gotyourfiles-patches-"));
  } catch {
    await writeExportLog({
      request,
      projectId: id,
      commitCount: commitHashes.length,
      baseRef: base,
      status: "failed",
    });
    return new Response("Failed to create temp directory", { status: 500 });
  }

  try {
    const newestHash = commitHashes[0];
    const oldestHash = commitHashes[commitHashes.length - 1];

    try {
      const parent = await execGit(["rev-parse", `${oldestHash}~1`], cwd);
      const selectedRange = await execGit(["rev-list", `${parent.trim()}..${newestHash}`, "--no-merges"], cwd);
      const rangeHashes = selectedRange.split("\n").filter(Boolean);
      if (rangeHashes.length !== commitHashes.length || rangeHashes.some((hash, index) => hash !== commitHashes[index])) {
        throw new Error("Selected commits must be a continuous range from HEAD");
      }
      await execGit(["format-patch", `${parent.trim()}..${newestHash}`, "-o", tmpDir, "--no-merges"], cwd);
    } catch (err) {
      if (err instanceof Error && err.message === "Selected commits must be a continuous range from HEAD") {
        throw err;
      }
      await execGit(["format-patch", "--root", newestHash, "-o", tmpDir, "--no-merges"], cwd);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    await writeExportLog({
      request,
      projectId: id,
      commitCount: commitHashes.length,
      baseRef: base,
      status: "failed",
    });
    return new Response(`Failed to generate patches: ${message}`, { status: 500 });
  }

  const output = new PassThrough();
  const projectName = project.id;
  const archiveName = `${projectName}-patches-${commitHashes.length}.zip`;

  const zip = spawn("zip", ["-j", "-r", "-", tmpDir], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  const zipTimeout = EXPORT_TIMEOUT_MS > 0
    ? setTimeout(() => {
        zip.kill("SIGTERM");
        output.destroy(new Error("Compression timeout"));
      }, EXPORT_TIMEOUT_MS)
    : null;

  zip.stderr.resume();
  zip.stdout.pipe(output);

  zip.on("error", () => {
    if (zipTimeout) clearTimeout(zipTimeout);
    output.destroy(new Error("Compression failed"));
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  zip.on("exit", (code, signal) => {
    if (zipTimeout) clearTimeout(zipTimeout);
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    if (signal || (code !== null && code !== 0)) {
      output.destroy(new Error("Compression failed"));
    }
  });

  request.signal.addEventListener("abort", () => {
    if (zipTimeout) clearTimeout(zipTimeout);
    zip.kill("SIGTERM");
    output.destroy(new Error("Client aborted"));
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  return new Response(Readable.toWeb(output) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(archiveName)}`,
    },
  });
}
