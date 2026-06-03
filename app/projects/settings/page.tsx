import type { Metadata } from "next";
import Link from "next/link";
import ProjectsConfigEditor from "@/components/ProjectsConfigEditor";

export const metadata: Metadata = {
  title: "项目配置",
};

export default function ProjectsSettingsPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">项目配置</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/projects" className="text-primary hover:underline">
            返回项目
          </Link>
          <Link href="/" className="text-primary hover:underline">
            返回首页
          </Link>
        </div>
      </div>
      <p className="mt-3 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
        在此配置项目列表和站点信息。配置保存后将立即生效。
      </p>
      <ProjectsConfigEditor
        texts={{
          loadingLabel: "加载配置中...",
          errorLabel: "加载失败",
          saveLabel: "保存配置",
          savingLabel: "保存中...",
          savedLabel: "已保存",
          addProjectLabel: "新增项目",
          deleteLabel: "删除",
          cancelLabel: "收起",
          confirmDeleteMessage: "确定要删除这个项目吗？",
          tabProjects: "项目列表",
          idLabel: "项目 ID（唯一标识，如 webox-dev）",
          titleZhLabel: "中文标题",
          titleEnLabel: "英文标题",
          descZhLabel: "中文描述",
          descEnLabel: "英文描述",
          tagsLabel: "标签（输入后按 Enter 添加）",
          linkLabel: "项目路径（本地绝对路径）",
          editLabel: "编辑",
          linkChangedHint: "路径修改后，现有下载链接将失效。请通知已获取链接的用户重新获取。",
        }}
      />
    </section>
  );
}
