"use client";

import { useCallback, useEffect, useState } from "react";

export default function CopyDownloadLinkButton({
  href,
  label,
  copiedLabel,
}: {
  href: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const [copyOrigin, setCopyOrigin] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));

  function isLocalHostname(hostname: string) {
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
  }

  const resolveCopyOrigin = useCallback(async () => {
    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (configuredSiteUrl) {
      try {
        return new URL(configuredSiteUrl).origin;
      } catch {}
    }
    if (!isLocalHostname(window.location.hostname)) {
      return window.location.origin;
    }
    try {
      const res = await fetch("/api/system/share-origin", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && typeof data?.origin === "string" && data.origin) {
        return data.origin;
      }
    } catch {}
    return window.location.origin;
  }, []);

  useEffect(() => {
    let active = true;
    const fallbackOrigin = copyOrigin || window.location.origin;
    resolveCopyOrigin().then((origin) => {
      if (!active) return;
      setCopyOrigin(origin || fallbackOrigin);
    });
    return () => {
      active = false;
    };
  }, [copyOrigin, resolveCopyOrigin]);

  function copyByExecCommand(text: string) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  }

  async function handleCopy() {
    const absoluteHref = new URL(href, copyOrigin || window.location.origin).toString();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(absoluteHref);
      } else if (!copyByExecCommand(absoluteHref)) {
        return;
      }
    } catch {
      if (!copyByExecCommand(absoluteHref)) {
        return;
      }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <button onClick={handleCopy} className="text-xs rounded-md border px-2 py-1 hover:bg-accent" type="button">
      {copied ? copiedLabel : label}
    </button>
  );
}
