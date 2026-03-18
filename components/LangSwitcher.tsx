"use client";
import { usePathname, useRouter } from "next/navigation";

export default function LangSwitcher() {
  const pathname = usePathname();
  const router = useRouter();

  const isEN = pathname?.startsWith("/en");
  const toggle = () => {
    if (!pathname) return;
    if (isEN) {
      const zhPath = pathname === "/en" ? "/" : pathname.replace(/^\/en/, "");
      router.push(zhPath || "/");
    } else {
      const enPath = pathname === "/" ? "/en" : `/en${pathname}`;
      router.push(enPath);
    }
  };

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
      aria-label={isEN ? "切换到中文" : "Switch to English"}
      title={isEN ? "切换到中文" : "Switch to English"}
    >
      {isEN ? "EN" : "中文"}
    </button>
  );
}

