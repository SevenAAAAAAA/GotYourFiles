import type { Metadata } from "next";
import Link from "next/link";
import path from "node:path";
import { notFound } from "next/navigation";
import { getProjectsEn } from "@/lib/serverData";
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
  const project = getProjectsEn().find((item) => item.id === id);
  if (!project) {
    return { title: "Project Not Found" };
  }
  return {
    title: `${project.title} - Local Commits`,
  };
}

export default async function ProjectCommitsPageEN({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { p } = await searchParams;
  const project = getProjectsEn().find((item) => item.id === id);

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
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{project.title} Local Commits</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href={repositoryRelative ? { pathname: `/en/projects/${id}`, query: { p: repositoryRelative } } : `/en/projects/${id}`}
            className="text-primary hover:underline"
          >
            Back to Folder
          </Link>
          <Link href="/en/projects" className="text-primary hover:underline">
            Back to Projects
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
          loadingLabel: "Loading",
          errorLabel: "Error",
          notRepoLabel: "This project directory is not a Git repository.",
          noCommitsLabel: "No unpushed commits found — all commits are synced with remote.",
          branchLabel: "Branch",
          baseRefLabel: "Base ref",
          refreshLabel: "Refresh",
          exportLabel: "Export Patch",
          exportingLabel: "Exporting...",
          selectAllLabel: "Select All",
          deselectAllLabel: "Deselect All",
          selectedCountLabel: "Selected",
          filesChangedLabel: "files",
          backToProject: "Back to Projects",
          viewProjectLabel: "View Project",
          noTrackingLabel: "No tracking",
        }}
      />
    </section>
  );
}
