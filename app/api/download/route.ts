import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { appendFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { PassThrough, Readable } from "node:stream";
import { projectsEn, projectsZh, shouldIgnoreDirectoryEntry } from "@/lib/data";

const RATE_LIMIT_WINDOW_MS = Number(process.env.DOWNLOAD_RATE_LIMIT_WINDOW_MS ?? "60000");
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.DOWNLOAD_RATE_LIMIT_MAX_REQUESTS ?? "30");
const ZIP_TIMEOUT_MS = Number(process.env.DOWNLOAD_ZIP_TIMEOUT_MS ?? "60000");
const FOLDER_SIZE_CACHE_TTL_MS = Number(process.env.FOLDER_SIZE_CACHE_TTL_MS ?? "600000");
const FOLDER_SIZE_TIMEOUT_MS = Number(process.env.FOLDER_SIZE_TIMEOUT_MS ?? "20000");
const DOWNLOAD_LOG_FILE = process.env.DOWNLOAD_LOG_FILE ?? path.join(process.cwd(), "download-events.log");
const rateLimitStore = new Map<string, number[]>();
const folderSizeCache = new Map<string, { sizeBytes: number; expiresAt: number }>();
const folderSizeInFlight = new Map<string, Promise<number>>();

function getProjectById(id: string) {
  return projectsZh.find((project) => project.id === id) ?? projectsEn.find((project) => project.id === id);
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

function isPathInsideRoot(rootPath: string, targetPath: string) {
  return targetPath === rootPath || targetPath.startsWith(`${rootPath}${path.sep}`);
}

function hasIgnoredSegment(relativePath: string) {
  return relativePath
    .split("/")
    .filter(Boolean)
    .some((segment) => shouldIgnoreDirectoryEntry(segment));
}

function getClientIp(request: Request) {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const records = rateLimitStore.get(ip) ?? [];
  const nextRecords = records.filter((timestamp) => timestamp >= windowStart);
  nextRecords.push(now);
  rateLimitStore.set(ip, nextRecords);
  return nextRecords.length > RATE_LIMIT_MAX_REQUESTS;
}

async function calculateDirectorySize(directoryPath: string) {
  let totalBytes = 0;
  const stack = [directoryPath];
  while (stack.length > 0) {
    const currentPath = stack.pop();
    if (!currentPath) {
      continue;
    }
    const dirents = await readdir(currentPath, { withFileTypes: true });
    for (const dirent of dirents) {
      if (shouldIgnoreDirectoryEntry(dirent.name) || dirent.isSymbolicLink()) {
        continue;
      }
      const entryPath = path.join(currentPath, dirent.name);
      if (dirent.isDirectory()) {
        stack.push(entryPath);
        continue;
      }
      if (!dirent.isFile()) {
        continue;
      }
      const entryStats = await stat(entryPath);
      totalBytes += entryStats.size;
    }
  }
  return totalBytes;
}

function getFolderSizeCached(cacheKey: string, directoryPath: string) {
  const now = Date.now();
  const cached = folderSizeCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return Promise.resolve(cached.sizeBytes);
  }
  const running = folderSizeInFlight.get(cacheKey);
  if (running) {
    return running;
  }
  const nextPromise = calculateDirectorySize(directoryPath)
    .then((sizeBytes) => {
      folderSizeCache.set(cacheKey, { sizeBytes, expiresAt: Date.now() + FOLDER_SIZE_CACHE_TTL_MS });
      return sizeBytes;
    })
    .finally(() => {
      folderSizeInFlight.delete(cacheKey);
    });
  folderSizeInFlight.set(cacheKey, nextPromise);
  return nextPromise;
}

async function writeDownloadLog({
  request,
  projectId,
  targetType,
  relativePath,
  status,
}: {
  request: Request;
  projectId: string;
  targetType: "file" | "folder";
  relativePath: string;
  status: "started" | "failed";
}) {
  const logLine = `${JSON.stringify({
    timestamp: new Date().toISOString(),
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent") || "",
    projectId,
    relativePath,
    targetType,
    status,
  })}\n`;
  try {
    await appendFile(DOWNLOAD_LOG_FILE, logLine, "utf8");
  } catch {}
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const rawRelative = searchParams.get("p") ?? "";
  const mode = searchParams.get("mode");

  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  const clientIp = getClientIp(request);
  if (isRateLimited(clientIp)) {
    return new Response("Too many requests", { status: 429 });
  }

  const project = getProjectById(id);

  if (!project) {
    return new Response("Project not found", { status: 404 });
  }

  const rootPath = path.resolve(project.link);
  const safeRelative = normalizeRelativePath(rawRelative);

  if (safeRelative && hasIgnoredSegment(safeRelative)) {
    return new Response("Forbidden", { status: 403 });
  }

  const targetPath = path.resolve(rootPath, safeRelative);

  if (!isPathInsideRoot(rootPath, targetPath)) {
    return new Response("Forbidden", { status: 403 });
  }

  let stats;
  try {
    stats = await stat(targetPath);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const downloadName = path.basename(targetPath) || `${project.id}`;

  if (stats.isFile()) {
    await writeDownloadLog({
      request,
      projectId: id,
      targetType: "file",
      relativePath: safeRelative,
      status: "started",
    });
    const fileStream = createReadStream(targetPath);
    return new Response(Readable.toWeb(fileStream) as ReadableStream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      },
    });
  }

  if (stats.isDirectory()) {
    if (mode === "size-check") {
      const cacheKey = `${id}:${safeRelative}`;
      try {
        const sizeBytes = await Promise.race<number>([
          getFolderSizeCached(cacheKey, targetPath),
          new Promise((_, reject) => {
            const timer = setTimeout(() => {
              clearTimeout(timer);
              reject(new Error("Folder size timeout"));
            }, FOLDER_SIZE_TIMEOUT_MS);
          }),
        ]);
        return Response.json({ sizeBytes }, { status: 200 });
      } catch {
        return Response.json({ error: "Folder size timeout" }, { status: 504 });
      }
    }
    const parentDir = path.dirname(targetPath);
    const folderName = path.basename(targetPath);
    const archiveName = `${downloadName}.zip`;
    const output = new PassThrough();
    await writeDownloadLog({
      request,
      projectId: id,
      targetType: "folder",
      relativePath: safeRelative,
      status: "started",
    });
    const zip = spawn("zip", ["-r", "-", folderName], {
      cwd: parentDir,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const timeout = setTimeout(() => {
      zip.kill("SIGTERM");
      output.destroy(new Error("Compression timeout"));
    }, ZIP_TIMEOUT_MS);

    zip.stdout.pipe(output);
    zip.on("error", async () => {
      clearTimeout(timeout);
      output.destroy(new Error("Compression failed"));
      await writeDownloadLog({
        request,
        projectId: id,
        targetType: "folder",
        relativePath: safeRelative,
        status: "failed",
      });
    });
    zip.on("exit", async (code, signal) => {
      clearTimeout(timeout);
      if (signal || (code !== null && code !== 0)) {
        output.destroy(new Error("Compression failed"));
        await writeDownloadLog({
          request,
          projectId: id,
          targetType: "folder",
          relativePath: safeRelative,
          status: "failed",
        });
      }
    });

    request.signal.addEventListener("abort", () => {
      clearTimeout(timeout);
      zip.kill("SIGTERM");
      output.destroy(new Error("Client aborted"));
    });

    return new Response(Readable.toWeb(output) as ReadableStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(archiveName)}`,
      },
    });
  }

  return new Response("Unsupported target", { status: 400 });
}
