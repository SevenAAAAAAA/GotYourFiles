import type { Metadata } from "next";
import Link from "next/link";
import { projectsZh } from "@/lib/data";

export const metadata: Metadata = {
  title: "项目",
  alternates: {
    canonical: "/projects",
    languages: {
      "zh-CN": "/projects",
      "en-US": "/en/projects",
    },
  },
};

const projects = projectsZh;

export default function ProjectsPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">项目</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/projects/logs" className="text-primary hover:underline">
            下载日志
          </Link>
          <Link href="/" className="text-primary hover:underline">
            返回首页
          </Link>
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {projects.map((p) => (
          <Link
            key={p.title}
            href={`/projects/${p.id}`}
            className="block rounded-lg border p-6 bg-card hover:bg-accent/40 transition-colors"
          >
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-semibold">{p.title}</h2>
              <span className="text-sm text-primary">查看</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {p.tags.map((t) => (
                <span key={t} className="rounded-md border px-2 py-1 text-xs text-muted-foreground">{t}</span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
