import type { Metadata } from "next";
import Link from "next/link";
import DownloadLogsViewer from "@/components/DownloadLogsViewer";
import { projectsEn } from "@/lib/data";

type SearchParams = {
  projectId?: string | string[];
};

export const metadata: Metadata = {
  title: "Download Logs",
};

export default async function DownloadLogsPageEN({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { projectId } = await searchParams;
  const initialProjectId = Array.isArray(projectId) ? projectId[0] ?? "" : projectId ?? "";

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Download Logs</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/en/projects" className="text-primary hover:underline">
            Back to Projects
          </Link>
          <Link href="/en" className="text-primary hover:underline">
            Back Home
          </Link>
        </div>
      </div>

      <DownloadLogsViewer
        projects={projectsEn.map((project) => ({ id: project.id, title: project.title }))}
        initialProjectId={initialProjectId}
        labels={{
          heading: "Filters and Details",
          submit: "Search",
          reset: "Reset",
          loading: "Loading logs...",
          empty: "No matching logs",
          errorPrefix: "Request failed: ",
          totalPrefix: "Total: ",
          time: "Time",
          ip: "IP",
          project: "Project",
          path: "Path",
          type: "Type",
          status: "Status",
          userAgent: "User-Agent",
          from: "From",
          to: "To",
          allProjects: "All projects",
          allTypes: "All types",
          allStatus: "All status",
          fileType: "File",
          folderType: "Folder",
          startedStatus: "Started",
          failedStatus: "Failed",
          pageSize: "Page size",
          previous: "Previous",
          next: "Next",
          pageInfo: "Page {page} / {totalPages}",
        }}
      />
    </section>
  );
}
