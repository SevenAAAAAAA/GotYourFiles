"use client";

import { useState } from "react";

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
    const absoluteHref = new URL(href, window.location.origin).toString();
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
