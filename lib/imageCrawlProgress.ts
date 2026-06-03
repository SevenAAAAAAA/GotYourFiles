type ImageCrawlPhase = "idle" | "fetching-page" | "extracting" | "downloading" | "zipping" | "done" | "error" | "cancelled";

export type ImageCrawlProgress = {
  progressId: string;
  phase: ImageCrawlPhase;
  current: number;
  total: number;
  savedCount: number;
  skippedCount: number;
  message: string;
  updatedAt: number;
};

type ProgressStore = Map<string, ImageCrawlProgress>;

declare global {
  var __gotYourFilesImageCrawlProgress__: ProgressStore | undefined;
}

const store: ProgressStore = globalThis.__gotYourFilesImageCrawlProgress__ ?? new Map();
globalThis.__gotYourFilesImageCrawlProgress__ = store;

function now() {
  return Date.now();
}

export function setImageCrawlProgress(
  progressId: string,
  patch: Partial<Omit<ImageCrawlProgress, "progressId" | "updatedAt">>,
) {
  const prev =
    store.get(progressId) ??
    ({
      progressId,
      phase: "idle",
      current: 0,
      total: 0,
      savedCount: 0,
      skippedCount: 0,
      message: "",
      updatedAt: now(),
    } satisfies ImageCrawlProgress);

  const next: ImageCrawlProgress = {
    ...prev,
    ...patch,
    progressId,
    updatedAt: now(),
  };
  store.set(progressId, next);
  return next;
}

export function getImageCrawlProgress(progressId: string) {
  return store.get(progressId) ?? null;
}

export function clearImageCrawlProgress(progressId: string) {
  store.delete(progressId);
}
