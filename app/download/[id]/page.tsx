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
  return value.toLocaleString("zh-CN");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = getProjectsZh().find((item) => item.id === id) ?? getProjectsEn().find((item) => item.id === id);
  if (!project) {
    return { title: "下载链接不存在" };
  }
  return { title: `下载 ${project.title}` };
}

export default async function DownloadLandingPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { p } = await searchParams;
  const project = getProjectsZh().find((item) => item.id === id) ?? getProjectsEn().find((item) => item.id === id);
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
        <p className="text-sm text-muted-foreground">来自项目：{project.title}</p>
        <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">你收到一个下载链接</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {isDirectory ? "该链接将下载文件夹压缩包（ZIP）。" : "该链接将直接下载文件。"}
        </p>
        <div className="mt-6 rounded-lg border bg-background px-4 py-3 text-sm">
          <p className="break-all"><span className="text-muted-foreground">名称：</span>{targetName}</p>
          <p className="mt-1"><span className="text-muted-foreground">类型：</span>{isDirectory ? "文件夹" : "文件"}</p>
          {!isDirectory ? (
            <p className="mt-1"><span className="text-muted-foreground">大小：</span>{formatSize(targetStats.size)}</p>
          ) : null}
          {isDirectory && childrenCount !== null ? (
            <p className="mt-1"><span className="text-muted-foreground">包含：</span>{childrenCount} 项</p>
          ) : null}
          <p className="mt-1"><span className="text-muted-foreground">更新时间：</span>{formatDate(targetStats.mtime)}</p>
        </div>
        <AutoDownloadPanel
          downloadHref={downloadHref}
          targetName={targetName}
          isDirectory={isDirectory}
          texts={{
            downloadingLabel: "正在下载",
            successLabel: "下载完成",
            failedLabel: "下载失败",
            retryLabel: "重新下载",
            directLabel: "直接下载链接",
            bytesLabel: "进度",
            unknownTotalLabel: "未知总大小",
            startedHint: "进入页面后已自动开始下载。",
            successHint: "文件已处理完成并已触发浏览器保存。",
          }}
        />
      </div>
    </section>
  );
}
