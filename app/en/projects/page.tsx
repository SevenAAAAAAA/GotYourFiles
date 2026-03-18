import type { Metadata } from "next";
import Link from "next/link";
import { projectsEn } from "@/lib/data";

export const metadata: Metadata = {
  title: "Projects",
  alternates: {
    canonical: "/en/projects",
    languages: {
      "en-US": "/en/projects",
      "zh-CN": "/projects",
    },
  },
};

export default function ProjectsEN() {
  const projects = projectsEn;
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Projects</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/en/projects/logs" className="text-primary hover:underline">
            Download Logs
          </Link>
          <Link href="/en" className="text-primary hover:underline">
            Back Home
          </Link>
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {projects.map((p) => (
          <Link
            key={p.title}
            href={`/en/projects/${p.id}`}
            className="block rounded-lg border p-6 bg-card hover:bg-accent/40 transition-colors"
          >
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-semibold">{p.title}</h2>
              <span className="text-sm text-primary">View</span>
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
