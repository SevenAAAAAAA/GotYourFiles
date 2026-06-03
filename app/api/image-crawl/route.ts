import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";
import { imageSize } from "image-size";
import {
  clearImageCrawlProgress,
  getImageCrawlProgress,
  setImageCrawlProgress,
} from "@/lib/imageCrawlProgress";
import {
  cleanupExpiredCache,
  createCachedZip,
  deleteCachedZip,
  encodeRFC5987ValueChars,
  readCachedZip,
  toSafeAsciiFilename,
} from "@/lib/zipCache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CrawlMode = "page" | "list";
type ImageFormat = "jpg" | "jpeg" | "png" | "webp" | "gif" | "bmp" | "svg" | "avif";

type CrawlRequestPayload = {
  mode: CrawlMode;
  pageUrl?: string;
  listText?: string;
  sameOriginOnly?: boolean;
  formats?: string[];
  aspectRatios?: string[];
  exactSizes?: string[];
  limit?: number;
  filename?: string;
  progressId?: string;
};

type CandidateImage = {
  url: string;
  source: "img" | "srcset" | "meta" | "attr" | "json" | "script" | "list";
};

const SUPPORTED_FORMATS: ImageFormat[] = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg", "avif"];
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const ASPECT_RATIO_TOLERANCE = 0.03;
const PAGE_FETCH_TIMEOUT_MS = 12000;
const IMAGE_FETCH_TIMEOUT_MS = 8000;

type ImageDimensions = {
  width: number;
  height: number;
};

function normalizeUrl(raw: string, baseUrl?: string) {
  const trimmed = raw.trim().replace(/^['"`]|['"`]$/g, "");
  if (!trimmed || /^data:/i.test(trimmed) || /^javascript:/i.test(trimmed)) {
    return null;
  }

  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}

function buildFetchSignal(signal: AbortSignal, timeoutMs: number) {
  return AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new DOMException("抓取已取消", "AbortError");
  }
}

function extractUniqueMatches(html: string, pattern: RegExp, resolver: (matched: string) => string | null) {
  const results = new Set<string>();
  for (const match of html.matchAll(pattern)) {
    const raw = match[1] ?? "";
    const resolved = resolver(raw);
    if (resolved) {
      results.add(resolved);
    }
  }
  return [...results];
}

function decodeEscapedUrl(raw: string) {
  return raw
    .replace(/\\u002F/gi, "/")
    .replace(/\\u003A/gi, ":")
    .replace(/\\u0026/gi, "&")
    .replace(/\\\//g, "/")
    .replace(/&amp;/gi, "&");
}

function looksLikeDecorativeAsset(url: string) {
  return /(?:^|\/)(?:logo|logos|sprite|icon|icons|favicon|avatar-placeholder|placeholder)(?:[._-]|\/|$)/i.test(url);
}

function getSourcePriority(source: CandidateImage["source"]) {
  switch (source) {
    case "list":
      return 100;
    case "json":
      return 90;
    case "attr":
      return 80;
    case "script":
      return 70;
    case "img":
      return 60;
    case "srcset":
      return 50;
    case "meta":
      return 40;
    default:
      return 0;
  }
}

function extractImagesFromHtml(html: string, pageUrl: string) {
  const candidates: CandidateImage[] = [];
  const pushMany = (urls: string[], source: CandidateImage["source"]) => {
    for (const url of urls) {
      candidates.push({ url, source });
    }
  };

  pushMany(
    extractUniqueMatches(
      html,
      /<img[^>]+(?:src|data-src|data-original)=["']([^"'<>]+)["']/gi,
      (raw) => normalizeUrl(raw, pageUrl),
    ),
    "img",
  );
  pushMany(
    extractUniqueMatches(
      html,
      /<(?:img|source)[^>]+srcset=["']([^"'<>]+)["']/gi,
      (raw) => {
        const first = raw
          .split(",")
          .map((entry) => entry.trim().split(/\s+/)[0] ?? "")
          .find(Boolean);
        return first ? normalizeUrl(first, pageUrl) : null;
      },
    ),
    "srcset",
  );
  pushMany(
    extractUniqueMatches(
      html,
      /<[^>]+\b(?:data-imgurl|data-objurl|data-thumburl|data-thumb|data-middleurl|data-middleimg|data-bigimg|data-iurl|data-img|data-url|data-picurl|data-source)=["']([^"'<>]+)["']/gi,
      (raw) => normalizeUrl(raw, pageUrl),
    ),
    "attr",
  );
  pushMany(
    extractUniqueMatches(
      html,
      /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"'<>]+)["']/gi,
      (raw) => normalizeUrl(raw, pageUrl),
    ),
    "meta",
  );

  const decodedHtml = decodeEscapedUrl(html);
  pushMany(
    extractUniqueMatches(
      decodedHtml,
      /(?:objURL|thumbURL|middleURL|hoverURL|replaceUrl|downloadUrl|imageUrl|imgUrl|originImageURL|largeTnImageUrl|waterfall_image_url|thumb_url|hover_url|download_url|img_url)["']?\s*[:=]\s*["']([^"'<>]+)["']/gi,
      (raw) => normalizeUrl(raw, pageUrl),
    ),
    "json",
  );
  pushMany(
    extractUniqueMatches(
      decodedHtml,
      /(https?:\/\/[^"'<>\s]+?\.(?:jpg|jpeg|png|webp|gif|bmp|svg|avif)(?:\?[^"'<>\s]*)?)/gi,
      (raw) => normalizeUrl(raw, pageUrl),
    ),
    "script",
  );

  const unique = new Map<string, CandidateImage>();
  for (const candidate of candidates) {
    if (looksLikeDecorativeAsset(candidate.url)) {
      continue;
    }
    const existing = unique.get(candidate.url);
    if (!existing || getSourcePriority(candidate.source) > getSourcePriority(existing.source)) {
      unique.set(candidate.url, candidate);
    }
  }
  return [...unique.values()];
}

function parseListUrls(listText: string) {
  const unique = new Set<string>();
  for (const entry of listText.split(/[\n,]/)) {
    const resolved = normalizeUrl(entry);
    if (resolved) {
      unique.add(resolved);
    }
  }
  return [...unique].map((url) => ({ url, source: "list" as const }));
}

function inferFormatFromContentType(contentType: string | null) {
  const mime = contentType?.split(";")[0].trim().toLowerCase() ?? "";
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/bmp":
      return "bmp";
    case "image/svg+xml":
      return "svg";
    case "image/avif":
      return "avif";
    default:
      return null;
  }
}

function inferFormatFromUrl(url: string) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const matched = pathname.match(/\.([a-z0-9]+)$/);
    if (!matched) {
      return null;
    }
    const extension = matched[1];
    if (extension === "jpg" || extension === "jpeg") return "jpg";
    if (SUPPORTED_FORMATS.includes(extension as ImageFormat)) {
      return extension as ImageFormat;
    }
    return null;
  } catch {
    return null;
  }
}

function parseAspectRatio(input: string) {
  const matched = input.trim().match(/^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/);
  if (!matched) {
    return null;
  }
  const width = Number(matched[1]);
  const height = Number(matched[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { label: `${width}:${height}`, value: width / height };
}

function parseExactSize(input: string) {
  const matched = input.trim().match(/^(\d+)\s*[x*]\s*(\d+)$/i);
  if (!matched) {
    return null;
  }
  const width = Number(matched[1]);
  const height = Number(matched[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
}

function extractDimensions(format: string, buffer: Buffer): ImageDimensions | null {
  if (format === "svg") {
    const text = buffer.toString("utf8");
    const widthMatch = text.match(/\bwidth=["']?\s*(\d+(?:\.\d+)?)(?:px)?["']?/i);
    const heightMatch = text.match(/\bheight=["']?\s*(\d+(?:\.\d+)?)(?:px)?["']?/i);
    if (widthMatch && heightMatch) {
      const width = Number(widthMatch[1]);
      const height = Number(heightMatch[1]);
      if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
        return { width: Math.round(width), height: Math.round(height) };
      }
    }
    const viewBoxMatch = text.match(/\bviewBox=["'][^"']*?(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)["']/i);
    if (viewBoxMatch) {
      const width = Number(viewBoxMatch[1]);
      const height = Number(viewBoxMatch[2]);
      if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
        return { width: Math.round(width), height: Math.round(height) };
      }
    }
  }

  try {
    const size = imageSize(buffer);
    if (size.width && size.height) {
      return { width: size.width, height: size.height };
    }
  } catch {}
  return null;
}

function matchesDimensionFilters(
  dimensions: ImageDimensions | null,
  aspectRatios: Array<{ label: string; value: number }>,
  exactSizes: ImageDimensions[],
) {
  if (aspectRatios.length === 0 && exactSizes.length === 0) {
    return { ok: true, reason: null as string | null };
  }
  if (!dimensions) {
    return { ok: false, reason: "无法识别图片尺寸" };
  }

  if (aspectRatios.length > 0) {
    const ratio = dimensions.width / dimensions.height;
    const matched = aspectRatios.some((item) => Math.abs(ratio - item.value) <= ASPECT_RATIO_TOLERANCE);
    if (!matched) {
      return {
        ok: false,
        reason: `比例不匹配 (${dimensions.width}x${dimensions.height})`,
      };
    }
  }

  if (exactSizes.length > 0) {
    const matched = exactSizes.some((item) => item.width === dimensions.width && item.height === dimensions.height);
    if (!matched) {
      return {
        ok: false,
        reason: `尺寸不匹配 (${dimensions.width}x${dimensions.height})`,
      };
    }
  }

  return { ok: true, reason: null as string | null };
}

function sanitizeBaseName(input: string) {
  return input
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function createImageFilename(url: string, format: string, usedNames: Set<string>, index: number) {
  let baseName = "image";
  try {
    const pathname = new URL(url).pathname;
    const matched = pathname.split("/").filter(Boolean).pop();
    if (matched) {
      baseName = sanitizeBaseName(matched.replace(/\.[a-z0-9]+$/i, "")) || "image";
    }
  } catch {}

  let candidate = `${String(index).padStart(3, "0")}-${baseName}.${format}`;
  let seq = 1;
  while (usedNames.has(candidate)) {
    candidate = `${String(index).padStart(3, "0")}-${baseName}-${seq}.${format}`;
    seq += 1;
  }
  usedNames.add(candidate);
  return candidate;
}

function toZipFilename(rawFilename: string | undefined, mode: CrawlMode) {
  const trimmed = rawFilename?.trim();
  if (!trimmed) {
    return `images-${mode}-${Date.now()}.zip`;
  }
  return trimmed.toLowerCase().endsWith(".zip") ? trimmed : `${trimmed}.zip`;
}

async function collectCandidates(payload: CrawlRequestPayload, signal: AbortSignal, progressId?: string) {
  throwIfAborted(signal);
  if (payload.mode === "page") {
    const pageUrl = payload.pageUrl?.trim();
    if (!pageUrl) {
      throw new Error("请先填写网页地址");
    }
    let parsedPageUrl: URL;
    try {
      parsedPageUrl = new URL(pageUrl);
    } catch {
      throw new Error("网页地址格式不正确");
    }

    if (progressId) {
      setImageCrawlProgress(progressId, {
        phase: "fetching-page",
        message: "正在抓取页面 HTML...",
      });
    }
    let response: Response;
    try {
      response = await fetch(parsedPageUrl.toString(), {
        signal: buildFetchSignal(signal, PAGE_FETCH_TIMEOUT_MS),
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          Referer: "https://www.baidu.com/",
          "Cache-Control": "no-cache",
        },
        cache: "no-store",
        redirect: "follow",
      });
    } catch (error) {
      throw error;
    }
    if (!response.ok) {
      throw new Error(`网页抓取失败: HTTP ${response.status}`);
    }
    const html = await response.text();
    throwIfAborted(signal);
    if (progressId) {
      setImageCrawlProgress(progressId, {
        phase: "extracting",
        message: "正在解析图片候选列表...",
      });
    }
    let candidates = extractImagesFromHtml(html, parsedPageUrl.toString());
    if (payload.sameOriginOnly) {
      candidates = candidates.filter((candidate) => {
        try {
          return new URL(candidate.url).origin === parsedPageUrl.origin;
        } catch {
          return false;
        }
      });
    }
    if (progressId) {
      setImageCrawlProgress(progressId, {
        phase: "downloading",
        total: candidates.length,
        current: 0,
        message: `已找到 ${candidates.length} 个候选图片`,
      });
    }
    return candidates;
  }

  const listText = payload.listText?.trim() ?? "";
  if (!listText) {
    throw new Error("请先粘贴图片链接");
  }
  return parseListUrls(listText);
}

async function downloadImages(
  candidates: CandidateImage[],
  formats: Set<string>,
  aspectRatios: Array<{ label: string; value: number }>,
  exactSizes: ImageDimensions[],
  limit: number,
  signal: AbortSignal,
  progressId?: string,
) {
  const zip = new JSZip();
  const manifest: Array<{
    originalUrl: string;
    savedAs?: string;
    format?: string;
    width?: number;
    height?: number;
    source: CandidateImage["source"];
    status: "saved" | "skipped";
    reason?: string;
  }> = [];
  const usedNames = new Set<string>();
  let savedCount = 0;
  let checkedCount = 0;

  for (const candidate of candidates) {
    throwIfAborted(signal);
    if (savedCount >= limit) {
      break;
    }
    checkedCount += 1;
    if (progressId) {
      setImageCrawlProgress(progressId, {
        phase: "downloading",
        current: checkedCount,
        total: candidates.length,
        savedCount,
        skippedCount: manifest.filter((item) => item.status === "skipped").length,
        message: `正在检查第 ${checkedCount} / ${candidates.length} 张`,
      });
    }
    try {
      const response = await fetch(candidate.url, {
        signal: buildFetchSignal(signal, IMAGE_FETCH_TIMEOUT_MS),
        headers: {
          "User-Agent": "GotYourFiles Image Crawler/1.0",
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          Referer: candidate.url,
        },
        cache: "no-store",
        redirect: "follow",
      });
      if (!response.ok) {
        manifest.push({
          originalUrl: candidate.url,
          source: candidate.source,
          status: "skipped",
          reason: `HTTP ${response.status}`,
        });
        continue;
      }

      const contentType = response.headers.get("content-type");
      const byMime = inferFormatFromContentType(contentType);
      const byUrl = inferFormatFromUrl(response.url || candidate.url);
      const format = byMime || byUrl;
      if (!format || !formats.has(format)) {
        manifest.push({
          originalUrl: candidate.url,
          source: candidate.source,
          status: "skipped",
          reason: format ? `格式 ${format} 未勾选` : "无法识别图片格式",
        });
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      throwIfAborted(signal);
      if (arrayBuffer.byteLength === 0) {
        manifest.push({
          originalUrl: candidate.url,
          source: candidate.source,
          status: "skipped",
          reason: "文件为空",
        });
        continue;
      }
      const buffer = Buffer.from(arrayBuffer);
      const dimensions = extractDimensions(format, buffer);
      const dimensionCheck = matchesDimensionFilters(dimensions, aspectRatios, exactSizes);
      if (!dimensionCheck.ok) {
        manifest.push({
          originalUrl: candidate.url,
          source: candidate.source,
          format,
          width: dimensions?.width,
          height: dimensions?.height,
          status: "skipped",
          reason: dimensionCheck.reason ?? "尺寸筛选未通过",
        });
        continue;
      }

      const savedAs = createImageFilename(response.url || candidate.url, format, usedNames, savedCount + 1);
      zip.file(`images/${savedAs}`, buffer);
      manifest.push({
        originalUrl: candidate.url,
        savedAs,
        format,
        width: dimensions?.width,
        height: dimensions?.height,
        source: candidate.source,
        status: "saved",
      });
      savedCount += 1;
      if (progressId) {
        setImageCrawlProgress(progressId, {
          phase: "downloading",
          current: checkedCount,
          total: candidates.length,
          savedCount,
          skippedCount: manifest.filter((item) => item.status === "skipped").length,
          message: `已保存 ${savedCount} 张，当前第 ${checkedCount} / ${candidates.length} 张`,
        });
      }
    } catch (error) {
      manifest.push({
        originalUrl: candidate.url,
        source: candidate.source,
        status: "skipped",
        reason: error instanceof Error ? error.message : "下载失败",
      });
      if (progressId) {
        setImageCrawlProgress(progressId, {
          phase: "downloading",
          current: checkedCount,
          total: candidates.length,
          savedCount,
          skippedCount: manifest.filter((item) => item.status === "skipped").length,
          message: `第 ${checkedCount} 张处理失败，继续抓取中...`,
        });
      }
    }
  }

  zip.file(
    "crawl-report.json",
    JSON.stringify(
      {
        checkedCount,
        savedCount,
        skippedCount: manifest.filter((item) => item.status === "skipped").length,
        manifest,
      },
      null,
      2,
    ),
  );

  if (progressId) {
    setImageCrawlProgress(progressId, {
      phase: "zipping",
      current: checkedCount,
      total: candidates.length,
      savedCount,
      skippedCount: manifest.filter((item) => item.status === "skipped").length,
      message: "正在生成 ZIP...",
    });
  }
  const zipData = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    platform: "UNIX",
    comment: "Generated by GotYourFiles image crawler",
    encodeFileName: (filename) => filename,
  });

  return {
    zipData,
    savedCount,
    checkedCount,
    skippedCount: manifest.filter((item) => item.status === "skipped").length,
  };
}

export async function POST(request: NextRequest) {
  let progressId = "";
  try {
    await cleanupExpiredCache();
    const payload = (await request.json()) as CrawlRequestPayload;
    const signal = request.signal;
    progressId = payload.progressId?.trim() || crypto.randomUUID();
    setImageCrawlProgress(progressId, {
      phase: "idle",
      current: 0,
      total: 0,
      savedCount: 0,
      skippedCount: 0,
      message: "任务已创建",
    });
    const formats = new Set(
      (payload.formats ?? [])
        .map((item) => item.trim().toLowerCase())
        .filter((item): item is ImageFormat => SUPPORTED_FORMATS.includes(item as ImageFormat)),
    );
    const aspectRatios = (payload.aspectRatios ?? []).map(parseAspectRatio).filter((item): item is { label: string; value: number } => !!item);
    const exactSizes = (payload.exactSizes ?? []).map(parseExactSize).filter((item): item is ImageDimensions => !!item);

    if (formats.size === 0) {
      return NextResponse.json({ error: "请至少选择一种图片格式" }, { status: 400 });
    }

    const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(payload.limit ?? DEFAULT_LIMIT)));
    const candidates = await collectCandidates(payload, signal, progressId);
    if (candidates.length === 0) {
      return NextResponse.json({ error: "没有找到可处理的图片链接" }, { status: 400 });
    }

    const { zipData, savedCount, checkedCount, skippedCount } = await downloadImages(
      candidates,
      formats,
      aspectRatios,
      exactSizes,
      limit,
      signal,
      progressId,
    );
    if (savedCount === 0) {
      return NextResponse.json({ error: "未成功抓取到符合条件的图片" }, { status: 400 });
    }

    const filename = toZipFilename(payload.filename, payload.mode);
    const cached = await createCachedZip(filename, zipData);
    setImageCrawlProgress(progressId, {
      phase: "done",
      current: checkedCount,
      total: candidates.length,
      savedCount,
      skippedCount,
      message: "ZIP 已生成，可下载",
    });

    return NextResponse.json({
      success: true,
      progressId,
      cacheId: cached.cacheId,
      filename,
      totalSize: zipData.length,
      imageCount: savedCount,
      checkedCount,
      skippedCount,
      expiresAt: cached.expiresAt,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      if (progressId) {
        setImageCrawlProgress(progressId, {
          phase: "cancelled",
          message: "抓取已取消",
        });
      }
      return NextResponse.json({ error: "抓取已取消" }, { status: 499 });
    }
    if (progressId) {
      setImageCrawlProgress(progressId, {
        phase: "error",
        message: error instanceof Error ? error.message : "图片抓取失败",
      });
    }
    const message = error instanceof Error ? error.message : "图片抓取失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await cleanupExpiredCache();
    const { searchParams } = new URL(request.url);
    const progressId = searchParams.get("progressId");
    if (progressId) {
      const progress = getImageCrawlProgress(progressId);
      if (!progress) {
        return NextResponse.json({ error: "Progress not found" }, { status: 404 });
      }
      return NextResponse.json(progress);
    }
    const cacheId = searchParams.get("id");
    if (!cacheId) {
      return NextResponse.json({ error: "No cache ID provided" }, { status: 400 });
    }

    const cached = await readCachedZip(cacheId);
    if (!cached) {
      return NextResponse.json({ error: "File not found or expired" }, { status: 404 });
    }

    const { meta, zipData } = cached;
    const asciiFilename = toSafeAsciiFilename(meta.filename);
    const encodedFilename = encodeRFC5987ValueChars(meta.filename);

    return new Response(new Uint8Array(zipData), {
      status: 200,
      headers: new Headers({
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
        "Content-Length": meta.size.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      }),
    });
  } catch {
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const progressId = searchParams.get("progressId");
    if (progressId) {
      clearImageCrawlProgress(progressId);
      return NextResponse.json({ success: true });
    }
    const cacheId = searchParams.get("id");
    if (!cacheId) {
      return NextResponse.json({ error: "No cache ID provided" }, { status: 400 });
    }

    await deleteCachedZip(cacheId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
