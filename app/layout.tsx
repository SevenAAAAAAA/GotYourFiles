import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Github, Linkedin, Mail, Menu } from "lucide-react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import LangSwitcher from "@/components/LangSwitcher";
import { SiteBrandLink, SiteOwnerName } from "@/components/SiteIdentity";
import { siteZh, siteLinks } from "@/lib/data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: siteZh.siteName,
    template: `%s | ${siteZh.siteName}`,
  },
  description: "我的电脑项目文件浏览及下载",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  alternates: { canonical: "/" },
  themeColor: "black",
  openGraph: {
    title: siteZh.siteName,
    description: "我的电脑项目文件浏览及下载",
    url: "/",
    siteName: siteZh.siteName,
    locale: "zh_CN",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "black",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <a href="#main" className="sr-only focus:not-sr-only focus-visible:underline px-3 py-2">
          跳到主要内容
        </a>
        <header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <SiteBrandLink />
            <div className="hidden md:flex items-center gap-2">
              <LangSwitcher />
              <ThemeToggle />
            </div>
            <div className="md:hidden">
              <details>
                <summary aria-label="打开菜单" className="inline-flex items-center justify-center rounded-md border px-2 py-1">
                  <Menu className="h-5 w-5" />
                </summary>
                <div className="absolute right-4 mt-2 w-fit rounded-md border bg-background shadow">
                  <div className="flex flex-col items-center gap-2 px-2 py-2"><LangSwitcher /><ThemeToggle /></div>
                </div>
              </details>
            </div>
          </div>
        </header>
        <main id="main" className="flex-1">{children}</main>
        <footer className="border-t">
          <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} <SiteOwnerName /></p>
            <div className="flex items-center gap-4">
              <Link href={siteLinks.email} aria-label="Email" className="hover:text-primary">
                <Mail className="h-5 w-5" />
              </Link>
              <Link href={siteLinks.github} target="_blank" rel="noreferrer" aria-label="GitHub" className="hover:text-primary">
                <Github className="h-5 w-5" />
              </Link>
              <Link href={siteLinks.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="hover:text-primary">
                <Linkedin className="h-5 w-5" />
              </Link>
            </div>
          </div>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Person",
                name: siteZh.ownerName,
                url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
                sameAs: [
                  siteLinks.github,
                  siteLinks.linkedin,
                  siteLinks.email,
                ],
              }),
            }}
          />
        </footer>
      </body>
    </html>
  );
}
