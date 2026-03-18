"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteEn, siteZh } from "@/lib/data";

export function SiteBrandLink() {
  const pathname = usePathname() || "/";
  const isEN = pathname.startsWith("/en");

  return (
    <Link href={isEN ? "/en" : "/"} className="text-base font-semibold">
      {isEN ? siteEn.siteName : siteZh.siteName}
    </Link>
  );
}

export function SiteOwnerName() {
  const pathname = usePathname() || "/";
  const isEN = pathname.startsWith("/en");

  return <>{isEN ? siteEn.ownerName : siteZh.ownerName}</>;
}
