import type { Metadata } from "next";
import Link from "next/link";
import path from "node:path";
import { readdir, stat } from "node:fs/promises";
import { notFound } from "next/navigation";
import { projectsZh, shouldIgnoreDirectoryEntry } from "@/lib/data";
import DirectoryEntriesList from "@/components/DirectoryEntriesList";

type Params = {
  id: string;
};

type SearchParams = {
  p?: string | string[];
};

export async function generateStaticParams() {
  return projectsZh.map((project) => ({ id: project.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = projectsZh.find((item) => item.id === id);

  if (!project) {
    return { title: "项目不存在" };
  }

  return {
    title: `${project.title} 文件夹`,
  };
}

export default async function ProjectFolderPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { p } = await searchParams;
  const project = projectsZh.find((item) => item.id === id);

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
  const currentPath = path.resolve(rootPath, safeRelative);
  const isInsideRoot = currentPath === rootPath || currentPath.startsWith(`${rootPath}${path.sep}`);
  const currentRelative = isInsideRoot ? safeRelative : "";
  const browsingPath = isInsideRoot ? currentPath : rootPath;
  const parentRelative = currentRelative ? path.posix.dirname(currentRelative) : "";
  const upRelative = parentRelative === "." ? "" : parentRelative;

  let loadError = "";
  let entries: Array<{ name: string; type: "folder" | "file"; nextRelative: string; sizeBytes: number | null; modifiedAt: string }> = [];

  try {
    const dirents = await readdir(browsingPath, { withFileTypes: true });
    const visibleDirents = dirents.filter((entry) => !shouldIgnoreDirectoryEntry(entry.name));
    entries = await Promise.all(
      visibleDirents.map(async (entry) => {
        const entryPath = path.join(browsingPath, entry.name);
        const entryStats = await stat(entryPath);
        return {
          name: entry.name,
          type: (entry.isDirectory() ? "folder" : "file") as "folder" | "file",
          nextRelative: currentRelative ? `${currentRelative}/${entry.name}` : entry.name,
          sizeBytes: entry.isFile() ? entryStats.size : null,
          modifiedAt: entryStats.mtime.toISOString(),
        };
      }),
    );
    entries = entries
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "folder" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  } catch {
    loadError = "目录读取失败，请确认路径存在并且当前进程有权限读取。";
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{project.title}</h1>
        <div className="flex items-center gap-4 text-sm">
          {currentRelative ? (
            <Link
              href={upRelative ? { pathname: `/projects/${id}`, query: { p: upRelative } } : `/projects/${id}`}
              className="text-primary hover:underline"
            >
              返回上一级
            </Link>
          ) : null}
          <Link href={{ pathname: "/projects/logs", query: { projectId: id } }} className="text-primary hover:underline">
            下载日志
          </Link>
          <Link href="/projects" className="text-primary hover:underline">
            返回项目
          </Link>
        </div>
      </div>
      <p className="mt-3 break-all rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
        {browsingPath}
      </p>
      {loadError ? (
        <p className="mt-6 rounded-md border px-4 py-3 text-sm text-destructive">{loadError}</p>
      ) : (
        <DirectoryEntriesList
          entries={entries}
          id={id}
          basePath={`/projects/${id}`}
          listTitle="目录内容（{count}）"
          searchPlaceholder="搜索文件夹或文件名"
          typeFolderLabel="文件夹"
          typeFileLabel="文件"
          downloadLabel="下载"
          copyLabel="复制链接"
          copiedLabel="已复制"
          emptySearchLabel="没有匹配结果"
          sizeLabel="大小"
          modifiedLabel="修改时间"
          filterAllLabel="全部类型"
          filterFilesLabel="仅文件"
          filterFoldersLabel="仅文件夹"
        />
      )}
    </section>
  );
}
