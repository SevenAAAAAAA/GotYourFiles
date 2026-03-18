"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CopyDownloadLinkButton from "@/components/CopyDownloadLinkButton";

type DirectoryEntry = {
  name: string;
  type: "folder" | "file";
  nextRelative: string;
  sizeBytes: number | null;
  modifiedAt: string;
};

type DirectoryEntriesListProps = {
  entries: DirectoryEntry[];
  id: string;
  basePath: string;
  listTitle: string;
  searchPlaceholder: string;
  typeFolderLabel: string;
  typeFileLabel: string;
  downloadLabel: string;
  copyLabel: string;
  copiedLabel: string;
  emptySearchLabel: string;
  sizeLabel: string;
  modifiedLabel: string;
  filterAllLabel: string;
  filterFilesLabel: string;
  filterFoldersLabel: string;
};

export default function DirectoryEntriesList({
  entries,
  id,
  basePath,
  listTitle,
  searchPlaceholder,
  typeFolderLabel,
  typeFileLabel,
  downloadLabel,
  copyLabel,
  copiedLabel,
  emptySearchLabel,
  sizeLabel,
  modifiedLabel,
  filterAllLabel,
  filterFilesLabel,
  filterFoldersLabel,
}: DirectoryEntriesListProps) {
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "file" | "folder">("all");
  const [checkingFolderPath, setCheckingFolderPath] = useState<string | null>(null);
  const isEnglish = filterAllLabel === "All types";
  const normalizedKeyword = keyword.trim().toLocaleLowerCase();
  const filterOptions: Array<{ value: "all" | "file" | "folder"; label: string }> = [
    { value: "all", label: filterAllLabel },
    { value: "file", label: filterFilesLabel },
    { value: "folder", label: filterFoldersLabel },
  ];

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesKeyword = !normalizedKeyword || entry.name.toLocaleLowerCase().includes(normalizedKeyword);
      const matchesType = typeFilter === "all" || entry.type === typeFilter;
      return matchesKeyword && matchesType;
    });
  }, [entries, normalizedKeyword, typeFilter]);

  function formatSize(sizeBytes: number | null, type: "folder" | "file") {
    if (type === "folder" || sizeBytes === null) {
      return "--";
    }
    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = sizeBytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    const displayValue = value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1);
    return `${displayValue} ${units[unitIndex]}`;
  }

  function formatModifiedTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "--";
    }
    return date.toLocaleString();
  }

  async function handleFolderDownload(nextRelative: string) {
    setCheckingFolderPath(nextRelative);
    try {
      const query = new URLSearchParams({ id, p: nextRelative, mode: "size-check" }).toString();
      const response = await fetch(`/api/download?${query}`);
      if (!response.ok) {
        window.alert(isEnglish ? "Failed to read folder size. Please try again." : "读取文件夹大小失败，请稍后重试。");
        return;
      }
      const payload = (await response.json()) as { sizeBytes?: number };
      if (typeof payload.sizeBytes !== "number") {
        window.alert(isEnglish ? "Failed to read folder size. Please try again." : "读取文件夹大小失败，请稍后重试。");
        return;
      }
      const shouldDownload = window.confirm(
        isEnglish
          ? `This folder is about ${formatSize(payload.sizeBytes, "file")}. Continue downloading?`
          : `该文件夹大小约为 ${formatSize(payload.sizeBytes, "file")}，是否继续下载？`,
      );
      if (!shouldDownload) {
        return;
      }
      window.location.href = `/api/download?id=${encodeURIComponent(id)}&p=${encodeURIComponent(nextRelative)}`;
    } catch {
      window.alert(isEnglish ? "Failed to read folder size. Please try again." : "读取文件夹大小失败，请稍后重试。");
    } finally {
      setCheckingFolderPath(null);
    }
  }

  return (
    <div className="mt-6 rounded-lg border bg-card">
      <div className="border-b px-4 py-3 text-sm text-muted-foreground">{listTitle.replace("{count}", String(filteredEntries.length))}</div>
      <div className="border-b px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center">
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex-1"
        />
        <div className="inline-flex w-fit shrink-0 self-start items-center gap-1 whitespace-nowrap rounded-md border bg-background p-1">
          {filterOptions.map((option) => {
            const active = typeFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTypeFilter(option.value)}
                className={`whitespace-nowrap rounded px-3 py-1.5 text-sm transition-colors ${
                  active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
      {filteredEntries.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">{emptySearchLabel}</p>
      ) : (
        <ul>
          {filteredEntries.map((entry) => (
            <li key={entry.name} className="flex items-center justify-between gap-4 px-4 py-3 border-b last:border-b-0">
              {entry.type === "folder" ? (
                <Link href={{ pathname: basePath, query: { p: entry.nextRelative } }} className="truncate text-primary hover:underline">
                  {entry.name}
                </Link>
              ) : (
                <span className="truncate">{entry.name}</span>
              )}
              <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                <span className="text-xs text-muted-foreground">{entry.type === "folder" ? typeFolderLabel : typeFileLabel}</span>
                <span>{sizeLabel}: {formatSize(entry.sizeBytes, entry.type)}</span>
                <span>{modifiedLabel}: {formatModifiedTime(entry.modifiedAt)}</span>
                {entry.type === "folder" ? (
                  <button
                    type="button"
                    onClick={() => handleFolderDownload(entry.nextRelative)}
                    disabled={checkingFolderPath === entry.nextRelative}
                    className="text-xs rounded-md border px-2 py-1 hover:bg-accent disabled:opacity-60"
                  >
                    {checkingFolderPath === entry.nextRelative ? (isEnglish ? "Calculating..." : "计算中...") : downloadLabel}
                  </button>
                ) : (
                  <a
                    href={`/api/download?id=${encodeURIComponent(id)}&p=${encodeURIComponent(entry.nextRelative)}`}
                    className="text-xs rounded-md border px-2 py-1 hover:bg-accent"
                  >
                    {downloadLabel}
                  </a>
                )}
                <CopyDownloadLinkButton
                  href={`/api/download?id=${encodeURIComponent(id)}&p=${encodeURIComponent(entry.nextRelative)}`}
                  label={copyLabel}
                  copiedLabel={copiedLabel}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
