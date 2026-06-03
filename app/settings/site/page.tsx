import type { Metadata } from "next";
import Link from "next/link";
import SiteConfigEditor from "@/components/SiteConfigEditor";

export const metadata: Metadata = {
  title: "站点信息配置",
};

export default function SiteSettingsPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">站点信息配置</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/projects" className="text-primary hover:underline">返回项目</Link>
          <Link href="/" className="text-primary hover:underline">返回首页</Link>
        </div>
      </div>
      <p className="mt-3 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
        在此配置网站名称、所有者、首页标语和底部链接。
      </p>
      <SiteConfigEditor
        texts={{
          loadingLabel: "加载配置中...",
          errorLabel: "加载失败",
          saveLabel: "保存配置",
          savingLabel: "保存中...",
          savedLabel: "已保存",
          chineseTitle: "中文站点信息",
          englishTitle: "英文站点信息",
          linksTitle: "链接",
          siteNameZhLabel: "中文站名",
          siteNameEnLabel: "英文站名",
          ownerZhLabel: "中文所有者",
          ownerEnLabel: "英文所有者",
          heroZhLabel: "中文标语",
          heroEnLabel: "英文标语",
          emailLabel: "邮箱",
          githubLabel: "GitHub",
          linkedinLabel: "LinkedIn",
        }}
      />
    </section>
  );
}
