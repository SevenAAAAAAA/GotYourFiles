"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  sortLabel: string;
  sortByNameLabel: string;
  sortByModifiedLabel: string;
  sortBySizeLabel: string;
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
  sortLabel,
  sortByNameLabel,
  sortByModifiedLabel,
  sortBySizeLabel,
}: DirectoryEntriesListProps) {
  const pageSize = 20;
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const previousPageRef = useRef(1);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "file" | "folder">("all");
  const [sortBy, setSortBy] = useState<"name" | "modified" | "size">("name");
  const [page, setPage] = useState(1);
  const [checkingFolderPath, setCheckingFolderPath] = useState<string | null>(null);
  const isEnglish = filterAllLabel === "All types";
  const normalizedKeyword = keyword.trim().toLocaleLowerCase();
  const filterOptions: Array<{ value: "all" | "file" | "folder"; label: string }> = [
    { value: "all", label: filterAllLabel },
    { value: "file", label: filterFilesLabel },
    { value: "folder", label: filterFoldersLabel },
  ];
  const sortOptions: Array<{ value: "name" | "modified" | "size"; label: string }> = [
    { value: "name", label: sortByNameLabel },
    { value: "modified", label: sortByModifiedLabel },
    { value: "size", label: sortBySizeLabel },
  ];

  const filteredEntries = useMemo(() => {
    const visibleEntries = entries.filter((entry) => {
      const matchesKeyword = !normalizedKeyword || entry.name.toLocaleLowerCase().includes(normalizedKeyword);
      const matchesType = typeFilter === "all" || entry.type === typeFilter;
      return matchesKeyword && matchesType;
    });
    return [...visibleEntries].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      if (sortBy === "modified") {
        const aTime = new Date(a.modifiedAt).getTime();
        const bTime = new Date(b.modifiedAt).getTime();
        const aValue = Number.isNaN(aTime) ? 0 : aTime;
        const bValue = Number.isNaN(bTime) ? 0 : bTime;
        if (aValue !== bValue) {
          return bValue - aValue;
        }
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "size") {
        const aValue = a.sizeBytes ?? -1;
        const bValue = b.sizeBytes ?? -1;
        if (aValue !== bValue) {
          return bValue - aValue;
        }
        return a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });
  }, [entries, normalizedKeyword, sortBy, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [entries]);

  useEffect(() => {
    setPage(1);
  }, [normalizedKeyword, sortBy, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredEntries.slice(startIndex, endIndex);
  }, [currentPage, filteredEntries]);
  const paginationItems = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set<number>([1, totalPages, currentPage]);

    if (currentPage <= 3) {
      pages.add(2);
      pages.add(3);
      pages.add(4);
    } else if (currentPage >= totalPages - 2) {
      pages.add(totalPages - 1);
      pages.add(totalPages - 2);
      pages.add(totalPages - 3);
    } else {
      pages.add(currentPage - 1);
      pages.add(currentPage + 1);
    }

    const sortedPages = [...pages].sort((a, b) => a - b);
    const items: Array<number | "ellipsis"> = [];

    sortedPages.forEach((pageNumber, index) => {
      const previousPage = sortedPages[index - 1];
      if (previousPage && pageNumber - previousPage > 1) {
        items.push("ellipsis");
      }
      items.push(pageNumber);
    });

    return items;
  }, [currentPage, totalPages]);

  const showingFrom = filteredEntries.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo = filteredEntries.length === 0 ? 0 : Math.min(currentPage * pageSize, filteredEntries.length);

  useEffect(() => {
    if (previousPageRef.current !== currentPage) {
      listContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      previousPageRef.current = currentPage;
    }
  }, [currentPage]);

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

  function getSharedDownloadHref(nextRelative: string) {
    const isEnPath = basePath.startsWith("/en/");
    const base = isEnPath ? `/en/download/${encodeURIComponent(id)}` : `/download/${encodeURIComponent(id)}`;
    return `${base}?p=${encodeURIComponent(nextRelative)}`;
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
    <div ref={listContainerRef} className="mt-6 rounded-lg border bg-card">
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
        <label className="ml-auto flex w-fit shrink-0 items-center gap-2 text-sm text-muted-foreground">
          <span>{sortLabel}</span>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as "name" | "modified" | "size")}
            className="rounded-md border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {filteredEntries.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">{emptySearchLabel}</p>
      ) : (
        <ul>
          {pagedEntries.map((entry) => (
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
                  href={getSharedDownloadHref(entry.nextRelative)}
                  label={copyLabel}
                  copiedLabel={copiedLabel}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {filteredEntries.length > 0 ? (
        <div className="border-t px-4 py-3">
          <div className="text-center text-xs text-muted-foreground">
            {isEnglish
              ? `Showing ${showingFrom}-${showingTo} of ${filteredEntries.length}`
              : `显示 ${showingFrom}-${showingTo} / ${filteredEntries.length}`}
          </div>
          {totalPages > 1 ? (
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
                className="rounded-md border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/60 disabled:opacity-60"
              >
                {isEnglish ? "Prev" : "上一页"}
              </button>
              {paginationItems.map((item, index) => {
                if (item === "ellipsis") {
                  return (
                    <span key={`ellipsis-${index}`} className="px-1 text-sm text-muted-foreground">
                      ...
                    </span>
                  );
                }

                const isActive = item === currentPage;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    aria-current={isActive ? "page" : undefined}
                    className={`min-w-9 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "bg-background text-muted-foreground hover:bg-accent/60"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="rounded-md border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/60 disabled:opacity-60"
              >
                {isEnglish ? "Next" : "下一页"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
