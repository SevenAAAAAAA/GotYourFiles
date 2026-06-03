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

type DailyCount = {
  date: string;
  count: number;
};

type DownloadLogResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  dailyCounts: DailyCount[];
  maxDailyCount: number;
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
    heatmapTitle: string;
    heatmapLess: string;
    heatmapMore: string;
    heatmapActiveDays: string;
    heatmapTooltipDate: string;
    heatmapTooltipCount: string;
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
    dailyCounts: [],
    maxDailyCount: 0,
    data: [],
  });
  const [heatTooltip, setHeatTooltip] = useState<null | { x: number; y: number; date: string; count: number }>(null);

  const pageSizeOptions = useMemo(() => [20, 50, 100], []);
  const safariFilterPanelStyle = isSafari ? { paddingTop: "1.25rem", paddingBottom: "1.25rem" } : undefined;
  const safariFilterActionsStyle = isSafari ? { paddingTop: "0.9375rem", paddingBottom: "0.9375rem" } : undefined;
  const inputClassName = "h-10 w-full rounded-md border bg-background px-3 text-sm";
  const selectClassName = `${inputClassName} pr-9`;
  const heatmapYear = useMemo(() => new Date().getFullYear(), []);
  const heatmapTitle = useMemo(
    () => labels.heatmapTitle.replace("{year}", String(heatmapYear)),
    [labels.heatmapTitle, heatmapYear],
  );
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
  const HEAT_CELL = 12;
  const HEAT_GAP = 3;
  const HEAT_MONTH_ROW = 14;
  const HEAT_COLORS = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
  const dayNameByIndex = useMemo(() => ["周一", "周二", "周三", "周四", "周五", "周六", "周日"], []);
  const heatmap = useMemo(() => {
    const dateCountMap = new Map(result.dailyCounts.map((item) => [item.date, item.count]));
    const yearStart = new Date(Date.UTC(heatmapYear, 0, 1));
    const yearEnd = new Date(Date.UTC(heatmapYear, 11, 31));
    const startWeekdayMon0 = (yearStart.getUTCDay() + 6) % 7;
    const endWeekdayMon0 = (yearEnd.getUTCDay() + 6) % 7;
    const gridStart = new Date(yearStart.getTime() - startWeekdayMon0 * 24 * 60 * 60 * 1000);
    const gridEnd = new Date(yearEnd.getTime() + (6 - endWeekdayMon0) * 24 * 60 * 60 * 1000);
    const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const weekCount = Math.ceil(totalDays / 7);

    const toDateKeyUTC = (d: Date) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

    const weeks = Array.from({ length: weekCount }, (_, weekIndex) =>
      Array.from({ length: 7 }, (_, dayIndex) => {
        const d = new Date(gridStart.getTime() + (weekIndex * 7 + dayIndex) * 24 * 60 * 60 * 1000);
        const dateKey = toDateKeyUTC(d);
        const count = dateCountMap.get(dateKey) ?? 0;
        const inTargetYear = d.getUTCFullYear() === heatmapYear;
        return { date: d, dateKey, count, inTargetYear };
      }),
    );

    const monthLabels = Array.from({ length: weekCount }, () => "");
    for (let month = 0; month < 12; month++) {
      const first = new Date(Date.UTC(heatmapYear, month, 1));
      const col = Math.floor((first.getTime() - gridStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (col >= 0 && col < weekCount) {
        monthLabels[col] = `${month + 1}月`;
      }
    }

    const maxDailyCount = result.dailyCounts.reduce((max, item) => Math.max(max, item.count), 0);
    return { weeks, monthLabels, maxDailyCount };
  }, [result.dailyCounts, heatmapYear]);

  function getHeatLevel(count: number, max: number) {
    if (count <= 0 || max <= 0) return 0;
    const ratio = count / max;
    if (ratio >= 0.75) return 4;
    if (ratio >= 0.5) return 3;
    if (ratio >= 0.25) return 2;
    return 1;
  }

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

      <div className="border-b px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium">{heatmapTitle}</div>
          <div className="text-xs text-muted-foreground">{labels.heatmapActiveDays}: {result.dailyCounts.length}</div>
        </div>
        <div className="rounded-lg border bg-[#0d1117] p-3">
          <div className="overflow-x-auto">
            <div className="inline-flex min-w-max gap-2">
              <div
                className="grid text-[10px] text-[#8b949e]"
                style={{
                  paddingTop: `${HEAT_MONTH_ROW + HEAT_GAP}px`,
                  gridTemplateRows: `repeat(7, ${HEAT_CELL}px)`,
                  rowGap: `${HEAT_GAP}px`,
                }}
              >
              {dayNameByIndex.map((name, idx) => (
                <div key={name} className="leading-none" style={{ height: `${HEAT_CELL}px` }}>
                  {idx === 0 || idx === 2 || idx === 4 ? name : ""}
                </div>
              ))}
              </div>
              <div>
                <div
                  className="mb-1 grid text-[10px] text-[#8b949e]"
                  style={{
                    height: `${HEAT_MONTH_ROW}px`,
                    gridTemplateColumns: `repeat(${heatmap.weeks.length}, ${HEAT_CELL}px)`,
                    columnGap: `${HEAT_GAP}px`,
                  }}
                >
                  {heatmap.monthLabels.map((label, idx) => (
                    <div key={`${label}-${idx}`} className="overflow-visible whitespace-nowrap leading-none">
                      {label}
                    </div>
                  ))}
                </div>
                <div
                  className="grid"
                  style={{
                    gridAutoFlow: "column",
                    gridTemplateRows: `repeat(7, ${HEAT_CELL}px)`,
                    gridAutoColumns: `${HEAT_CELL}px`,
                    gap: `${HEAT_GAP}px`,
                  }}
                >
                  {heatmap.weeks.flatMap((week) =>
                    week.map((cell) => {
                    const level = getHeatLevel(cell.count, heatmap.maxDailyCount);
                      return (
                        <div
                          key={cell.dateKey}
                          className="rounded-sm border"
                        style={{
                          borderColor: "#d0d7de",
                            backgroundColor: cell.inTargetYear ? HEAT_COLORS[level] : "#f6f8fa",
                        }}
                          onMouseEnter={(event) =>
                            setHeatTooltip({
                              x: event.clientX + 10,
                              y: event.clientY + 10,
                              date: cell.dateKey,
                              count: cell.count,
                            })
                          }
                          onMouseMove={(event) =>
                            setHeatTooltip((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    x: event.clientX + 10,
                                    y: event.clientY + 10,
                                  }
                                : prev,
                            )
                          }
                          onMouseLeave={() => setHeatTooltip(null)}
                        />
                      );
                    }),
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-[#8b949e]">
            <span>{labels.heatmapLess}</span>
            {HEAT_COLORS.map((color, idx) => (
              <div
                key={`${color}-${idx}`}
                className="block rounded-sm border"
                style={{ width: "14px", height: "14px", borderColor: "#d0d7de", backgroundColor: color }}
              />
            ))}
            <span>{labels.heatmapMore}</span>
          </div>
        </div>
      </div>
      {heatTooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border px-2 py-1.5 text-xs text-white shadow-lg"
          style={{
            left: `${heatTooltip.x}px`,
            top: `${heatTooltip.y}px`,
            backgroundColor: "#0d1117",
            borderColor: "#30363d",
            opacity: 1,
          }}
        >
          <div>{labels.heatmapTooltipDate}: {heatTooltip.date}</div>
          <div>{labels.heatmapTooltipCount}: {heatTooltip.count}</div>
        </div>
      )}

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
