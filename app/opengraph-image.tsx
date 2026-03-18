import { ImageResponse } from "next/og";
import { siteZh } from "@/lib/data";

export const runtime = "edge";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OGImage() {
  const title = `${siteZh.ownerName} | ${siteZh.siteName}`;
  const subtitle = "我的电脑项目文件浏览及下载";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg,#0b0b0f 0%, #1b1b29 35%, #5227FF 100%)",
          position: "relative",
          color: "#fff",
          fontSize: 64,
          fontWeight: 700,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(1000px 400px at 50% 70%, rgba(255,159,252,0.3), transparent), radial-gradient(700px 300px at 30% 30%, rgba(82,39,255,0.25), transparent)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            textShadow: "0 2px 12px rgba(0,0,0,0.35)",
          }}>{title}</div>
          <div style={{
            fontSize: 28,
            fontWeight: 400,
            color: "rgba(255,255,255,0.85)",
            textShadow: "0 1px 8px rgba(0,0,0,0.35)",
          }}>{subtitle}</div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
