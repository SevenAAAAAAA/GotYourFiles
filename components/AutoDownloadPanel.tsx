"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AutoDownloadTexts = {
  downloadingLabel: string;
  successLabel: string;
  failedLabel: string;
  retryLabel: string;
  directLabel: string;
  bytesLabel: string;
  unknownTotalLabel: string;
  startedHint: string;
  successHint: string;
};

type AutoDownloadPanelProps = {
  downloadHref: string;
  targetName: string;
  isDirectory: boolean;
  texts: AutoDownloadTexts;
};

function formatSize(sizeBytes: number) {
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

function triggerNativeDownload(downloadHref: string, fallbackName: string) {
  const anchor = document.createElement("a");
  anchor.href = downloadHref;
  anchor.download = fallbackName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export default function AutoDownloadPanel({
  downloadHref,
  targetName,
  isDirectory,
  texts,
}: AutoDownloadPanelProps) {
  const [status, setStatus] = useState<"idle" | "downloading" | "success" | "error">("idle");
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const startedRef = useRef(false);
  const fallbackName = useMemo(() => (isDirectory ? `${targetName}.zip` : targetName), [isDirectory, targetName]);

  const startDownload = useCallback(() => {
    setStatus("downloading");
    setDownloadedBytes(0);
    setTotalBytes(null);
    setErrorMessage("");
    try {
      triggerNativeDownload(downloadHref, fallbackName);
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    }
  }, [downloadHref, fallbackName]);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;
    const timer = window.setTimeout(startDownload, 0);
    return () => window.clearTimeout(timer);
  }, [startDownload]);

  const progress = totalBytes && totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : null;

  return (
    <div className="mt-6 rounded-lg border bg-background p-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          {status === "error" ? texts.failedLabel : status === "success" ? texts.successLabel : texts.downloadingLabel}
        </span>
        {progress !== null ? <span>{progress}%</span> : null}
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full ${progress === null ? "w-2/5 animate-pulse" : ""} bg-foreground transition-all`}
          style={progress !== null ? { width: `${progress}%` } : undefined}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {texts.bytesLabel}: {formatSize(downloadedBytes)} / {totalBytes ? formatSize(totalBytes) : texts.unknownTotalLabel}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {status === "success" ? texts.successHint : status === "error" ? errorMessage : texts.startedHint}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={startDownload}
          className="inline-flex rounded-md border px-4 py-2 text-sm hover:bg-accent"
        >
          {texts.retryLabel}
        </button>
        <a href={downloadHref} className="inline-flex rounded-md border px-4 py-2 text-sm hover:bg-accent">
          {texts.directLabel}
        </a>
      </div>
    </div>
  );
}
