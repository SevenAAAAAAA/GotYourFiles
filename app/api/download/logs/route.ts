import { readFile } from "node:fs/promises";
import path from "node:path";

type DownloadLogEvent = {
  timestamp: string;
  ip: string;
  userAgent: string;
  projectId: string;
  relativePath: string;
  targetType: "file" | "folder";
  status: "started" | "failed";
};

const DOWNLOAD_LOG_FILE = process.env.DOWNLOAD_LOG_FILE ?? path.join(process.cwd(), "download-events.log");
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 200;

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseDateToTimestamp(value: string | null) {
  if (!value) {
    return null;
  }
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    return null;
  }
  return time;
}

function isDownloadLogEvent(value: unknown): value is DownloadLogEvent {
  if (!value || typeof value !== "object") {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item.timestamp === "string" &&
    typeof item.ip === "string" &&
    typeof item.userAgent === "string" &&
    typeof item.projectId === "string" &&
    typeof item.relativePath === "string" &&
    (item.targetType === "file" || item.targetType === "folder") &&
    (item.status === "started" || item.status === "failed")
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ipFilter = searchParams.get("ip")?.trim() ?? "";
  const projectIdFilter = searchParams.get("projectId")?.trim() ?? "";
  const targetTypeFilter = searchParams.get("targetType")?.trim() ?? "";
  const statusFilter = searchParams.get("status")?.trim() ?? "";
  const from = parseDateToTimestamp(searchParams.get("from"));
  const to = parseDateToTimestamp(searchParams.get("to"));
  const page = parsePositiveInteger(searchParams.get("page"), DEFAULT_PAGE);
  const pageSize = Math.min(parsePositiveInteger(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

  if (searchParams.get("from") && from === null) {
    return Response.json({ error: "Invalid from parameter" }, { status: 400 });
  }
  if (searchParams.get("to") && to === null) {
    return Response.json({ error: "Invalid to parameter" }, { status: 400 });
  }
  if (from !== null && to !== null && from > to) {
    return Response.json({ error: "from must be earlier than to" }, { status: 400 });
  }
  if (targetTypeFilter && targetTypeFilter !== "file" && targetTypeFilter !== "folder") {
    return Response.json({ error: "Invalid targetType parameter" }, { status: 400 });
  }
  if (statusFilter && statusFilter !== "started" && statusFilter !== "failed") {
    return Response.json({ error: "Invalid status parameter" }, { status: 400 });
  }

  let fileContent = "";
  try {
    fileContent = await readFile(DOWNLOAD_LOG_FILE, "utf8");
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "ENOENT") {
      return Response.json({
        page,
        pageSize,
        total: 0,
        totalPages: 0,
        hasMore: false,
        data: [],
      });
    }
    return Response.json({ error: "Failed to read log file" }, { status: 500 });
  }

  const records = fileContent
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as unknown;
      } catch {
        return null;
      }
    })
    .filter((entry): entry is DownloadLogEvent => isDownloadLogEvent(entry))
    .map((entry) => ({ ...entry, timestampMs: Date.parse(entry.timestamp) }))
    .filter((entry) => Number.isFinite(entry.timestampMs))
    .filter((entry) => !ipFilter || entry.ip === ipFilter)
    .filter((entry) => !projectIdFilter || entry.projectId === projectIdFilter)
    .filter((entry) => !targetTypeFilter || entry.targetType === targetTypeFilter)
    .filter((entry) => !statusFilter || entry.status === statusFilter)
    .filter((entry) => from === null || entry.timestampMs >= from)
    .filter((entry) => to === null || entry.timestampMs <= to)
    .sort((a, b) => b.timestampMs - a.timestampMs);

  const total = records.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const data = records.slice(start, start + pageSize).map((entry) => ({
    timestamp: entry.timestamp,
    ip: entry.ip,
    userAgent: entry.userAgent,
    projectId: entry.projectId,
    relativePath: entry.relativePath,
    targetType: entry.targetType,
    status: entry.status,
  }));

  return Response.json({
    page,
    pageSize,
    total,
    totalPages,
    hasMore: page < totalPages,
    data,
  });
}
