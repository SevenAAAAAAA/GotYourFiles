import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_DIR = join(tmpdir(), "gotyourfiles-zip-cache");
const META_SUFFIX = ".meta.json";
const ZIP_SUFFIX = ".zip";

export type CacheMeta = {
  filename: string;
  timestamp: number;
  size: number;
};

function getMetaPath(cacheId: string) {
  return join(CACHE_DIR, `${cacheId}${META_SUFFIX}`);
}

function getZipPath(cacheId: string) {
  return join(CACHE_DIR, `${cacheId}${ZIP_SUFFIX}`);
}

export async function ensureCacheDir() {
  await mkdir(CACHE_DIR, { recursive: true });
}

export async function cleanupExpiredCache() {
  await ensureCacheDir();
  const now = Date.now();
  const files = await readdir(CACHE_DIR).catch(() => []);

  for (const file of files) {
    if (!file.endsWith(META_SUFFIX)) {
      continue;
    }

    const cacheId = file.slice(0, -META_SUFFIX.length);
    const metaPath = getMetaPath(cacheId);
    const zipPath = getZipPath(cacheId);

    try {
      const metaRaw = await readFile(metaPath, "utf-8");
      const meta = JSON.parse(metaRaw) as CacheMeta;
      if (now - meta.timestamp > CACHE_TTL_MS) {
        await Promise.allSettled([unlink(metaPath), unlink(zipPath)]);
      }
    } catch {
      await Promise.allSettled([unlink(metaPath), unlink(zipPath)]);
    }
  }
}

export async function createCachedZip(filename: string, zipData: Buffer) {
  await ensureCacheDir();
  const cacheId = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const timestamp = Date.now();
  const meta: CacheMeta = {
    filename,
    timestamp,
    size: zipData.length,
  };

  await Promise.all([
    writeFile(getZipPath(cacheId), zipData),
    writeFile(getMetaPath(cacheId), JSON.stringify(meta)),
  ]);

  return {
    cacheId,
    meta,
    expiresAt: timestamp + CACHE_TTL_MS,
  };
}

export async function readCachedZip(cacheId: string) {
  let meta: CacheMeta;
  try {
    const metaRaw = await readFile(getMetaPath(cacheId), "utf-8");
    meta = JSON.parse(metaRaw) as CacheMeta;
  } catch {
    return null;
  }

  if (Date.now() - meta.timestamp > CACHE_TTL_MS) {
    await deleteCachedZip(cacheId);
    return null;
  }

  try {
    const zipData = await readFile(getZipPath(cacheId));
    return { meta, zipData };
  } catch {
    return null;
  }
}

export async function deleteCachedZip(cacheId: string) {
  await Promise.allSettled([unlink(getMetaPath(cacheId)), unlink(getZipPath(cacheId))]);
}

export function toSafeAsciiFilename(filename: string) {
  return (
    filename
      .replace(/[\r\n"]/g, "_")
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/\s+/g, " ")
      .trim() || "download.zip"
  );
}

export function encodeRFC5987ValueChars(input: string) {
  return encodeURIComponent(input).replace(/['()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}
