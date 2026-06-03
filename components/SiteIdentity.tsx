"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SiteLocale } from "@/lib/data";

type SiteIdentityProps = {
  zh: SiteLocale;
  en: SiteLocale;
};

export function SiteBrandLink({ zh, en }: SiteIdentityProps) {
  const pathname = usePathname() || "/";
  const isEN = pathname.startsWith("/en");

  return (
    <Link href={isEN ? "/en" : "/"} className="text-base font-semibold">
      {isEN ? en.siteName : zh.siteName}
    </Link>
  );
}

export function SiteOwnerName({ zh, en }: SiteIdentityProps) {
  const pathname = usePathname() || "/";
  const isEN = pathname.startsWith("/en");

  return <>{isEN ? en.ownerName : zh.ownerName}</>;
}
