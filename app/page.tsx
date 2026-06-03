import type { Metadata } from "next";
import Link from "next/link";
import ShapeGrid from "@/components/ShapeGrid";
import { getSiteZh } from "@/lib/serverData";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
    languages: {
      "zh-CN": "/",
      "en-US": "/en",
    },
  },
};

export default function Home() {
  const siteZh = getSiteZh();
  return (
    <div className="relative h-[88vh] w-full bg-background">
      <ShapeGrid
        direction="right"
        speed={0.5}
        borderColor="#999"
        squareSize={40}
        hoverFillColor="#222"
        shape="square"
        hoverTrailAmount={0}
        className="absolute inset-0"
      />
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="mx-auto max-w-4xl px-6 text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-foreground/90">你好，我是{siteZh.ownerName}</h1>
          <p className="text-base md:text-lg text-muted-foreground">{siteZh.heroTagline}</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Link
              href="/projects"
              className="inline-flex rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:bg-foreground/90"
              aria-label="查看项目"
            >
              查看项目
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
