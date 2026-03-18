import type { Metadata } from "next";
import Link from "next/link";
import path from "node:path";
import { readdir, stat } from "node:fs/promises";
import { notFound } from "next/navigation";
import { projectsEn, shouldIgnoreDirectoryEntry } from "@/lib/data";
import DirectoryEntriesList from "@/components/DirectoryEntriesList";

type Params = {
  id: string;
};

type SearchParams = {
  p?: string | string[];
};

export async function generateStaticParams() {
  return projectsEn.map((project) => ({ id: project.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = projectsEn.find((item) => item.id === id);

  if (!project) {
    return { title: "Project Not Found" };
  }

  return {
    title: `${project.title} Folder`,
  };
}

export default async function ProjectFolderPageEN({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { p } = await searchParams;
  const project = projectsEn.find((item) => item.id === id);

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
    loadError = "Cannot read this directory. Please check whether the path exists and is readable.";
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{project.title}</h1>
        <div className="flex items-center gap-4 text-sm">
          {currentRelative ? (
            <Link
              href={upRelative ? { pathname: `/en/projects/${id}`, query: { p: upRelative } } : `/en/projects/${id}`}
              className="text-primary hover:underline"
            >
              Back
            </Link>
          ) : null}
          <Link href={{ pathname: "/en/projects/logs", query: { projectId: id } }} className="text-primary hover:underline">
            Download Logs
          </Link>
          <Link href="/en/projects" className="text-primary hover:underline">
            Back to Projects
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
          basePath={`/en/projects/${id}`}
          listTitle="Directory Contents ({count})"
          searchPlaceholder="Search folders or files"
          typeFolderLabel="Folder"
          typeFileLabel="File"
          downloadLabel="Download"
          copyLabel="Copy Link"
          copiedLabel="Copied"
          emptySearchLabel="No matching results"
          sizeLabel="Size"
          modifiedLabel="Modified"
          filterAllLabel="All types"
          filterFilesLabel="Files only"
          filterFoldersLabel="Folders only"
        />
      )}
    </section>
  );
}
