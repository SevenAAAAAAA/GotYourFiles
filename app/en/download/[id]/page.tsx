import type { Metadata } from "next";
import path from "node:path";
import { readdir, stat } from "node:fs/promises";
import { notFound } from "next/navigation";
import AutoDownloadPanel from "@/components/AutoDownloadPanel";
import { getProjectsEn, getProjectsZh, shouldIgnoreDirectoryEntry } from "@/lib/serverData";

type Params = {
  id: string;
};

type SearchParams = {
  p?: string | string[];
};

function formatSize(sizeBytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = sizeBytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const displayValue = value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${displayValue} ${units[unitIndex]}`;
}

function formatDate(value: Date) {
  return value.toLocaleString("en-US");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = getProjectsEn().find((item) => item.id === id) ?? getProjectsZh().find((item) => item.id === id);
  if (!project) {
    return { title: "Download Link Not Found" };
  }
  return { title: `Download ${project.title}` };
}

export default async function DownloadLandingPageEN({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { p } = await searchParams;
  const project = getProjectsEn().find((item) => item.id === id) ?? getProjectsZh().find((item) => item.id === id);
  if (!project) {
    notFound();
  }

  const rootPath = path.resolve(project.link);
  const rawRelative = Array.isArray(p) ? p[0] ?? "" : p ?? "";
  const normalizedRelative = path.posix
    .normalize(rawRelative.replaceAll("\\", "/"))
    .replace(/^\/+/, "");
  const safeRelative =
    normalizedRelative === "." || normalizedRelative.startsWith("..") ? "" : normalizedRelative;
  if (safeRelative && safeRelative.split("/").some((segment) => shouldIgnoreDirectoryEntry(segment))) {
    notFound();
  }

  const targetPath = path.resolve(rootPath, safeRelative);
  const isInsideRoot = targetPath === rootPath || targetPath.startsWith(`${rootPath}${path.sep}`);
  if (!isInsideRoot) {
    notFound();
  }

  let targetStats: Awaited<ReturnType<typeof stat>>;
  try {
    targetStats = await stat(targetPath);
  } catch {
    notFound();
  }

  const targetName = path.basename(targetPath) || project.title;
  const isDirectory = targetStats.isDirectory();
  const downloadHref = `/api/download?id=${encodeURIComponent(id)}&p=${encodeURIComponent(safeRelative)}`;
  let childrenCount: number | null = null;
  if (isDirectory) {
    try {
      const dirents = await readdir(targetPath, { withFileTypes: true });
      childrenCount = dirents.filter((entry) => !shouldIgnoreDirectoryEntry(entry.name)).length;
    } catch {
      childrenCount = null;
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <div className="rounded-xl border bg-card p-6 md:p-8">
        <p className="text-sm text-muted-foreground">Shared from project: {project.title}</p>
        <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">You received a download link</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {isDirectory ? "This link will download a ZIP archive of the folder." : "This link will download the file directly."}
        </p>
        <div className="mt-6 rounded-lg border bg-background px-4 py-3 text-sm">
          <p className="break-all"><span className="text-muted-foreground">Name:</span> {targetName}</p>
          <p className="mt-1"><span className="text-muted-foreground">Type:</span> {isDirectory ? "Folder" : "File"}</p>
          {!isDirectory ? (
            <p className="mt-1"><span className="text-muted-foreground">Size:</span> {formatSize(targetStats.size)}</p>
          ) : null}
          {isDirectory && childrenCount !== null ? (
            <p className="mt-1"><span className="text-muted-foreground">Contains:</span> {childrenCount} items</p>
          ) : null}
          <p className="mt-1"><span className="text-muted-foreground">Modified:</span> {formatDate(targetStats.mtime)}</p>
        </div>
        <AutoDownloadPanel
          downloadHref={downloadHref}
          targetName={targetName}
          isDirectory={isDirectory}
          texts={{
            downloadingLabel: "Downloading",
            successLabel: "Download completed",
            failedLabel: "Download failed",
            retryLabel: "Retry Download",
            directLabel: "Direct Download Link",
            bytesLabel: "Progress",
            unknownTotalLabel: "Unknown total size",
            startedHint: "Download starts automatically when this page opens.",
            successHint: "The file is processed and save has been triggered in your browser.",
          }}
        />
      </div>
    </section>
  );
}
