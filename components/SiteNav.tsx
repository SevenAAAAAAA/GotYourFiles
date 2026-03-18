"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Variant = "desktop" | "mobile";

export default function SiteNav({ variant = "desktop" }: { variant?: Variant }) {
  const pathname = usePathname() || "/";
  const isEN = pathname.startsWith("/en");
  const prefix = isEN ? "/en" : "";

  const items = [
    { href: "/projects", zh: "项目", en: "Projects" },
  ].map((i) => ({
    href: `${prefix}${i.href}`,
    label: isEN ? i.en : i.zh,
    active: pathname === `${prefix}${i.href}` || pathname.startsWith(`${prefix}${i.href}/`),
  }));

  if (variant === "mobile") {
    return (
      <div className="p-2 grid gap-1 text-sm">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`rounded px-2 py-1 hover:bg-accent ${i.active ? "text-primary" : ""}`}
          >
            {i.label}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <nav className="hidden md:flex items-center gap-6 text-sm" aria-label={isEN ? "Main" : "主导航"}>
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={`hover:text-primary ${i.active ? "text-primary" : ""}`}
          aria-current={i.active ? "page" : undefined}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
