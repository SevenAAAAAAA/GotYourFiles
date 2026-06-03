"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type RemoteInfo = {
  remote: string;
  branch: string;
  tracking: string;
};

type CommitEntry = {
  hash: string;
  shortHash: string;
  subject: string;
  author: string;
  date: string;
  timestamp: number;
  filesChanged: number;
  fileList: string;
  index: number;
};

type GitCommitsTexts = {
  loadingLabel: string;
  errorLabel: string;
  notRepoLabel: string;
  noCommitsLabel: string;
  branchLabel: string;
  baseRefLabel: string;
  refreshLabel: string;
  exportLabel: string;
  exportingLabel: string;
  selectAllLabel: string;
  deselectAllLabel: string;
  selectedCountLabel: string;
  filesChangedLabel: string;
  backToProject: string;
  viewProjectLabel: string;
  noTrackingLabel: string;
};

type GitCommitsPanelProps = {
  projectId: string;
  repositoryRelative: string;
  texts: GitCommitsTexts;
};

function selectNewestCommits(commits: CommitEntry[], count: number) {
  return new Set(commits.slice(0, count).map((commit) => commit.hash));
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export default function GitCommitsPanel({ projectId, repositoryRelative, texts }: GitCommitsPanelProps) {
  const hasLoadedRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [branch, setBranch] = useState("");
  const [remoteInfos, setRemoteInfos] = useState<RemoteInfo[]>([]);
  const [baseRef, setBaseRef] = useState("");
  const [detectedBaseRef, setDetectedBaseRef] = useState("");
  const [commits, setCommits] = useState<CommitEntry[]>([]);
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const fetchCommits = useCallback(
    async (customBase?: string) => {
      setStatus("loading");
      setErrorMsg("");
      try {
        const params = new URLSearchParams({ id: projectId });
        if (repositoryRelative) params.set("p", repositoryRelative);
        const effectiveBase = customBase ?? baseRef;
        if (effectiveBase) params.set("base", effectiveBase);
        const res = await fetch(`/api/git/commits?${params}`);
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setErrorMsg(data.error || `HTTP ${res.status}`);
          return;
        }
        setBranch(data.branch || "");
        setRemoteInfos(data.remoteInfos || []);
        setDetectedBaseRef(data.baseRef || "");
        if (!customBase && !baseRef) {
          setBaseRef(data.baseRef || "");
        }
        setCommits(data.commits || []);
        setSelectedSet(new Set((data.commits || []).map((c: CommitEntry) => c.hash)));
        setStatus("loaded");
      } catch (e) {
        setStatus("error");
        setErrorMsg(e instanceof Error ? e.message : "Unknown error");
      }
    },
    [projectId, repositoryRelative, baseRef],
  );

  useEffect(() => {
    if (hasLoadedRef.current) {
      return;
    }
    hasLoadedRef.current = true;
    fetchCommits();
  }, [fetchCommits]);

  const toggleSelect = (hash: string) => {
    const index = commits.findIndex((commit) => commit.hash === hash);
    if (index < 0) return;
    const isSelected = selectedSet.has(hash);
    setSelectedSet(selectNewestCommits(commits, isSelected ? index : index + 1));
  };

  const toggleSelectAll = () => {
    if (selectedSet.size === commits.length) {
      setSelectedSet(new Set());
    } else {
      setSelectedSet(selectNewestCommits(commits, commits.length));
    }
  };

  const selectedCount = selectedSet.size;
  const allSelected = commits.length > 0 && selectedCount === commits.length;

  const handleExport = useCallback(async () => {
    if (selectedCount === 0 || exporting) return;
    setExporting(true);
    try {
      const selectedCommits = commits.filter((commit) => selectedSet.has(commit.hash));
      const params = new URLSearchParams({ id: projectId });
      if (repositoryRelative) params.set("p", repositoryRelative);
      params.set("commits", selectedCommits.map((commit) => commit.hash).join(","));
      if (baseRef) params.set("base", baseRef);
      const anchor = document.createElement("a");
      anchor.href = `/api/git/export?${params}`;
      anchor.download = `${projectId}-patches-${selectedCount}.zip`;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } finally {
      setExporting(false);
    }
  }, [projectId, repositoryRelative, commits, selectedCount, selectedSet, baseRef, exporting]);

  const trackingOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { label: string; value: string }[] = [];
    for (const ri of remoteInfos) {
      const key = `${ri.remote}/${ri.branch}`;
      if (seen.has(key)) continue;
      seen.add(key);
      opts.push({ label: key, value: key });
    }
    return opts;
  }, [remoteInfos]);

  return (
    <div className="mt-6 rounded-lg border bg-card">
      <div className="border-b px-4 py-3 text-sm text-muted-foreground">
        {texts.loadingLabel}: {commits.length} commits
      </div>

      <div className="border-b px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {branch ? (
            <span className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">
              {texts.branchLabel}: {branch}
            </span>
          ) : null}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <label htmlFor="base-ref-input" className="whitespace-nowrap text-xs">
              {texts.baseRefLabel}:
            </label>
            <div className="flex items-center gap-1">
              <input
                id="base-ref-input"
                type="text"
                value={baseRef}
                onChange={(e) => setBaseRef(e.target.value)}
                placeholder={detectedBaseRef || texts.noTrackingLabel}
                className="w-48 rounded-md border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {trackingOptions.length > 0 ? (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) setBaseRef(e.target.value);
                  }}
                  className="rounded-md border bg-background px-1 py-1 text-xs text-muted-foreground outline-none"
                >
                  <option value="">▾</option>
                  {trackingOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchCommits()}
            className="rounded-md border bg-background px-3 py-1 text-xs hover:bg-accent"
          >
            {texts.refreshLabel}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {texts.selectedCountLabel}: {selectedCount}/{commits.length}
          </span>
          <button
            type="button"
            onClick={toggleSelectAll}
            className="rounded-md border bg-background px-3 py-1 text-xs hover:bg-accent"
          >
            {allSelected ? texts.deselectAllLabel : texts.selectAllLabel}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={selectedCount === 0 || exporting}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {exporting ? texts.exportingLabel : texts.exportLabel}
          </button>
        </div>
      </div>

      {status === "loading" ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">{texts.loadingLabel}</p>
      ) : status === "error" ? (
        <p className="px-4 py-8 text-center text-sm">
          <span className="text-destructive">{texts.errorLabel}: {errorMsg}</span>
          {errorMsg.includes("not a git repository") || errorMsg.includes("Not a valid") ? (
            <span className="ml-1 text-muted-foreground">{texts.notRepoLabel}</span>
          ) : null}
        </p>
      ) : commits.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">{texts.noCommitsLabel}</p>
      ) : (
        <ul>
          {commits.map((commit) => {
            const isSelected = selectedSet.has(commit.hash);
            return (
              <li
                key={commit.hash}
                className="flex items-start gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-accent/40 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(commit.hash)}
                  className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-primary"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <code className="text-xs font-mono text-primary whitespace-nowrap">{commit.shortHash}</code>
                    <span className="text-sm font-medium truncate">{commit.subject}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{commit.author}</span>
                    <span>{formatRelativeDate(commit.date)}</span>
                    <span>{texts.filesChangedLabel}: {commit.filesChanged}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
