import type { Metadata } from "next";
import Link from "next/link";
import DownloadLogsViewer from "@/components/DownloadLogsViewer";
import { projectsZh } from "@/lib/data";

type SearchParams = {
  projectId?: string | string[];
};

export const metadata: Metadata = {
  title: "下载日志",
};

export default async function DownloadLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { projectId } = await searchParams;
  const initialProjectId = Array.isArray(projectId) ? projectId[0] ?? "" : projectId ?? "";

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">下载日志</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/projects" className="text-primary hover:underline">
            返回项目
          </Link>
          <Link href="/" className="text-primary hover:underline">
            返回首页
          </Link>
        </div>
      </div>

      <DownloadLogsViewer
        projects={projectsZh.map((project) => ({ id: project.id, title: project.title }))}
        initialProjectId={initialProjectId}
        labels={{
          heading: "筛选与日志明细",
          submit: "查询",
          reset: "重置",
          loading: "日志加载中...",
          empty: "暂无匹配日志",
          errorPrefix: "查询失败：",
          totalPrefix: "总条数：",
          time: "时间",
          ip: "IP",
          project: "项目",
          path: "路径",
          type: "类型",
          status: "状态",
          userAgent: "User-Agent",
          from: "开始时间",
          to: "结束时间",
          allProjects: "全部项目",
          allTypes: "全部类型",
          allStatus: "全部状态",
          fileType: "文件",
          folderType: "文件夹",
          startedStatus: "开始",
          failedStatus: "失败",
          pageSize: "每页条数",
          previous: "上一页",
          next: "下一页",
          pageInfo: "第 {page} / {totalPages} 页",
        }}
      />
    </section>
  );
}
