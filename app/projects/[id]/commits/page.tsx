import type { Metadata } from "next";
import Link from "next/link";
import path from "node:path";
import { notFound } from "next/navigation";
import { getProjectsZh } from "@/lib/serverData";
import GitCommitsPanel from "@/components/GitCommitsPanel";

type Params = {
  id: string;
};

type SearchParams = {
  p?: string | string[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = getProjectsZh().find((item) => item.id === id);
  if (!project) {
    return { title: "项目不存在" };
  }
  return {
    title: `${project.title} - 本地提交`,
  };
}

export default async function ProjectCommitsPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { p } = await searchParams;
  const project = getProjectsZh().find((item) => item.id === id);

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
  const targetPath = path.resolve(rootPath, safeRelative);
  const isInsideRoot = targetPath === rootPath || targetPath.startsWith(`${rootPath}${path.sep}`);
  const repositoryRelative = isInsideRoot ? safeRelative : "";
  const repositoryPath = isInsideRoot ? targetPath : rootPath;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{project.title} 本地提交</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href={repositoryRelative ? { pathname: `/projects/${id}`, query: { p: repositoryRelative } } : `/projects/${id}`}
            className="text-primary hover:underline"
          >
            返回文件夹
          </Link>
          <Link href="/projects" className="text-primary hover:underline">
            返回项目
          </Link>
        </div>
      </div>
      <p className="mt-3 break-all rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
        {repositoryPath}
      </p>
      <GitCommitsPanel
        projectId={id}
        repositoryRelative={repositoryRelative}
        texts={{
          loadingLabel: "加载中",
          errorLabel: "错误",
          notRepoLabel: "该项目目录不是 Git 仓库。",
          noCommitsLabel: "没有未推送的提交，或所有提交已与远程同步。",
          branchLabel: "当前分支",
          baseRefLabel: "对比基准",
          refreshLabel: "刷新",
          exportLabel: "导出 Patch",
          exportingLabel: "导出中...",
          selectAllLabel: "全选",
          deselectAllLabel: "取消全选",
          selectedCountLabel: "已选",
          filesChangedLabel: "变更文件",
          backToProject: "返回项目",
          viewProjectLabel: "查看项目",
          noTrackingLabel: "无远程跟踪",
        }}
      />
    </section>
  );
}
