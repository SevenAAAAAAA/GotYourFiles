"use client";
import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  useEffect(() => {
    let next: "dark" | "light" = "dark";
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "light" || stored === "dark") {
        next = stored;
      } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        next = "dark";
      } else {
        next = "light";
      }
    } catch {}

    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }, []);

  function toggle() {
    const isDark = document.documentElement.classList.contains("dark");
    const next: "dark" | "light" = isDark ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
      aria-label="切换主题"
      title="切换主题"
    >
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="hidden h-4 w-4 dark:block" />
    </button>
  );
}
