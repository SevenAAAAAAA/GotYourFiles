"use client";

import { useEffect, useMemo, useState } from "react";

type ProjectOption = {
  id: string;
  title: string;
};

type DownloadLogRow = {
  timestamp: string;
  ip: string;
  userAgent: string;
  projectId: string;
  relativePath: string;
  targetType: "file" | "folder";
  status: "started" | "failed";
};

type DownloadLogResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  data: DownloadLogRow[];
};

type DownloadLogsViewerProps = {
  projects: ProjectOption[];
  initialProjectId?: string;
  labels: {
    heading: string;
    submit: string;
    reset: string;
    loading: string;
    empty: string;
    errorPrefix: string;
    totalPrefix: string;
    time: string;
    ip: string;
    project: string;
    path: string;
    type: string;
    status: string;
    userAgent: string;
    from: string;
    to: string;
    allProjects: string;
    allTypes: string;
    allStatus: string;
    fileType: string;
    folderType: string;
    startedStatus: string;
    failedStatus: string;
    pageSize: string;
    previous: string;
    next: string;
    pageInfo: string;
  };
};

export default function DownloadLogsViewer({ projects, initialProjectId = "", labels }: DownloadLogsViewerProps) {
  const [projectId, setProjectId] = useState(initialProjectId);
  const [ip, setIp] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [targetType, setTargetType] = useState<"" | "file" | "folder">("");
  const [status, setStatus] = useState<"" | "started" | "failed">("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [isSafari, setIsSafari] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({
    projectId: initialProjectId,
    ip: "",
    from: "",
    to: "",
    targetType: "" as "" | "file" | "folder",
    status: "" as "" | "started" | "failed",
    pageSize: 20,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DownloadLogResponse>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasMore: false,
    data: [],
  });

  const pageSizeOptions = useMemo(() => [20, 50, 100], []);
  const safariFilterPanelStyle = isSafari ? { paddingTop: "1.25rem", paddingBottom: "1.25rem" } : undefined;
  const safariFilterActionsStyle = isSafari ? { paddingTop: "0.9375rem", paddingBottom: "0.9375rem" } : undefined;
  const inputClassName = "h-10 w-full rounded-md border bg-background px-3 text-sm";
  const selectClassName = `${inputClassName} pr-9`;
  const selectStyle = {
    WebkitAppearance: "none" as const,
    MozAppearance: "none" as const,
    appearance: "none" as const,
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat" as const,
    backgroundPosition: "right 0.75rem center",
    backgroundSize: "12px 12px",
  };

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsSafari(/Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|FxiOS/i.test(ua));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(appliedFilters.pageSize),
    });
    if (appliedFilters.projectId) {
      query.set("projectId", appliedFilters.projectId);
    }
    if (appliedFilters.ip) {
      query.set("ip", appliedFilters.ip);
    }
    if (appliedFilters.from) {
      query.set("from", appliedFilters.from);
    }
    if (appliedFilters.to) {
      query.set("to", appliedFilters.to);
    }
    if (appliedFilters.targetType) {
      query.set("targetType", appliedFilters.targetType);
    }
    if (appliedFilters.status) {
      query.set("status", appliedFilters.status);
    }

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/download/logs?${query.toString()}`, { signal: controller.signal });
        const payload = (await response.json()) as DownloadLogResponse | { error?: string };
        if (!response.ok) {
          throw new Error("error" in payload ? payload.error || "Request failed" : "Request failed");
        }
        setResult(payload as DownloadLogResponse);
      } catch (nextError) {
        if ((nextError as { name?: string }).name === "AbortError") {
          return;
        }
        const message = (nextError as Error).message || "Request failed";
        setError(`${labels.errorPrefix}${message}`);
      } finally {
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [appliedFilters, labels.errorPrefix, page]);

  function submitFilters() {
    setAppliedFilters({
      projectId: projectId.trim(),
      ip: ip.trim(),
      from: from.trim(),
      to: to.trim(),
      targetType,
      status,
      pageSize,
    });
    setPage(1);
  }

  function resetFilters() {
    setProjectId(initialProjectId);
    setIp("");
    setFrom("");
    setTo("");
    setTargetType("");
    setStatus("");
    setPageSize(20);
    setAppliedFilters({
      projectId: initialProjectId,
      ip: "",
      from: "",
      to: "",
      targetType: "",
      status: "",
      pageSize: 20,
    });
    setPage(1);
  }

  return (
    <div className="mt-6 rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold">{labels.heading}</h2>
      </div>

      <div
        className="logs-filter-panel grid grid-cols-1 gap-3 border-b px-4 py-4 sm:grid-cols-2 md:grid-cols-3"
        style={safariFilterPanelStyle}
      >
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">{labels.project}</span>
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className={selectClassName} style={selectStyle}>
            <option value="">{labels.allProjects}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">{labels.ip}</span>
          <input value={ip} onChange={(event) => setIp(event.target.value)} className={inputClassName} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">{labels.pageSize}</span>
          <select
            value={pageSize}
            onChange={(event) => setPageSize(Number.parseInt(event.target.value, 10))}
            className={selectClassName}
            style={selectStyle}
          >
            {pageSizeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">{labels.from}</span>
          <input
            type="datetime-local"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className={inputClassName}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">{labels.to}</span>
          <input
            type="datetime-local"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className={inputClassName}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">{labels.type}</span>
          <select
            value={targetType}
            onChange={(event) => setTargetType(event.target.value as "" | "file" | "folder")}
            className={selectClassName}
            style={selectStyle}
          >
            <option value="">{labels.allTypes}</option>
            <option value="file">{labels.fileType}</option>
            <option value="folder">{labels.folderType}</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">{labels.status}</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as "" | "started" | "failed")}
            className={selectClassName}
            style={selectStyle}
          >
            <option value="">{labels.allStatus}</option>
            <option value="started">{labels.startedStatus}</option>
            <option value="failed">{labels.failedStatus}</option>
          </select>
        </label>
      </div>

      <div className="logs-filter-actions flex items-center justify-end gap-3 border-b px-4 py-3" style={safariFilterActionsStyle}>
        <button type="button" onClick={submitFilters} className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
          {labels.submit}
        </button>
        <button type="button" onClick={resetFilters} className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
          {labels.reset}
        </button>
        <span className="text-sm text-muted-foreground">{labels.totalPrefix}{result.total}</span>
      </div>

      {loading ? <p className="px-4 py-4 text-sm text-muted-foreground">{labels.loading}</p> : null}
      {error ? <p className="px-4 py-4 text-sm text-destructive">{error}</p> : null}

      {!loading && !error && result.data.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">{labels.empty}</p>
      ) : null}

      {!loading && !error && result.data.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">{labels.time}</th>
                <th className="px-4 py-2 font-medium">{labels.ip}</th>
                <th className="px-4 py-2 font-medium">{labels.project}</th>
                <th className="px-4 py-2 font-medium">{labels.path}</th>
                <th className="px-4 py-2 font-medium">{labels.type}</th>
                <th className="px-4 py-2 font-medium">{labels.status}</th>
                <th className="px-4 py-2 font-medium">{labels.userAgent}</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((item, index) => (
                <tr key={`${item.timestamp}-${item.projectId}-${item.relativePath}-${index}`} className="border-b align-top last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap">{new Date(item.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{item.ip}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{item.projectId}</td>
                  <td className="px-4 py-2 break-all">{item.relativePath || "/"}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {item.targetType === "file" ? labels.fileType : labels.folderType}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {item.status === "started" ? labels.startedStatus : labels.failedStatus}
                  </td>
                  <td className="px-4 py-2 break-all">{item.userAgent || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t px-4 py-3">
        <button
          type="button"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={page <= 1}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
        >
          {labels.previous}
        </button>
        <span className="text-sm text-muted-foreground">
          {labels.pageInfo.replace("{page}", String(page)).replace("{totalPages}", String(Math.max(result.totalPages, 1)))}
        </span>
        <button
          type="button"
          onClick={() => setPage((current) => (result.hasMore ? current + 1 : current))}
          disabled={!result.hasMore}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
        >
          {labels.next}
        </button>
      </div>
    </div>
  );
}
