"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MoreHorizontal, X, ChevronRight, ChevronLeft, Globe, Send, Code, Link2, FileArchive, Image as ImageIcon, SlidersHorizontal } from "lucide-react";
import { createPortal } from "react-dom";
import iconvLite from "iconv-lite";
import "iconv-lite/encodings";
import { Buffer } from "buffer";

type LanAutoDownloadTask = {
  fileName: string;
  downloadUrl: string;
};

function extractLanMessageStatus(rawMessage: string) {
  const normalized = rawMessage.trim().replace(/^["“]\s*/, "").replace(/\s*["”]$/, "");
  const matched = normalized.match(/^[^：:\n]+\s*[：:]\s*([^；;\n]+)/);
  return matched?.[1]?.trim() ?? "";
}

function shouldSkipLanAutoDownloadByStatus(status: string) {
  return /已删除|删除|deleted/i.test(status);
}

function parseLanAutoDownloadTask(rawMessage: string): LanAutoDownloadTask | null {
  const normalized = rawMessage.trim().replace(/^["“]\s*/, "").replace(/\s*["”]$/, "");
  const matched = normalized.match(/^([^：:\n]+)\s*[：:][\s\S]*?下载地址\s*[：:]\s*`?(https?:\/\/[^\s`"'”]+)`?/i);
  if (!matched) {
    return null;
  }
  const rawName = matched[1]?.trim() ?? "";
  const codeMatched = rawName.match(/^(.+?-合B)(?:-|$)/);
  if (!codeMatched) {
    return null;
  }
  const sourceUrl = matched[2]?.trim();
  if (!sourceUrl) {
    return null;
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    return null;
  }
  const rawPathParam = parsedUrl.searchParams.get("p");
  if (!rawPathParam) {
    return null;
  }
  const decodedSegments = rawPathParam
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
  const cutIndex = decodedSegments.findIndex((segment) => segment === "合B");
  if (cutIndex < 0) {
    return null;
  }
  const trimmedPath = decodedSegments
    .slice(0, cutIndex + 1)
    .join("/");
  parsedUrl.searchParams.set("p", trimmedPath);
  return {
    fileName: codeMatched[1],
    downloadUrl: parsedUrl.toString(),
  };
}

async function downloadLanAutoFile(task: LanAutoDownloadTask) {
  const response = await fetch(task.downloadUrl);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = task.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

type FlowTemplateId =
  | "scenario1"
  | "scenario2"
  | "scenario3"
  | "scenario4"
  | "scenario5"
  | "scenario6_front_rear"
  | "scenario7_runtime_link"
  | "custom";
type CloseVisiblePolicy = "always_hidden" | "wait_only" | "always_show" | "custom";
type ActionType = "primary" | "linkIndex";
type ActionSource = "primary" | "promo_response" | "custom_runtime";
type AfterPrimaryAction = "dismiss" | "hold";
type FirstClickBehavior = "goto_next_segment" | "route_primary" | "route_linkIndex" | "dismiss";
type HitAreaTargetType = "route_primary" | "route_linkIndex" | "goto_next_segment" | "dismiss";
type MissingAnimationFallback = "next_segment" | "dismiss";

type FlowFrame = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type FlowHitAreaForm = {
  id: string;
  eventName: string;
  frame: FlowFrame;
  targetType: HitAreaTargetType;
  targetLinkIndex: number;
};

type FlowConfigFormModel = {
  templateId: FlowTemplateId;
  enableCloseButton: boolean;
  closeButtonFrame: FlowFrame;
  closeVisiblePolicy: CloseVisiblePolicy;
  customCloseVisible: Record<string, boolean>;
  actionType: ActionType;
  actionSource: ActionSource;
  actionLinkIndex: number;
  afterPrimaryAction: AfterPrimaryAction;
  firstClickBehavior: FirstClickBehavior;
  firstClickLinkIndex: number;
  useHitAreas: boolean;
  hitAreas: FlowHitAreaForm[];
  nonTap: string;
  tapLoop: string;
  nonTap1: string;
  tapLoop1: string;
  nonTap2: string;
  tapLoop2: string;
  frontAnimation: string;
  rearAnimation: string;
  designWidth: number;
  designHeight: number;
  missingAnimationFallback: MissingAnimationFallback;
  customRuntimeSource: string;
};

type FlowConfigNode = {
  id: string;
  type: "animation" | "wait_event" | "action" | "ui" | "dismiss";
  slot?: "display" | "interactive";
  animation?: string;
  endPolicy?: "disappear" | "loop" | "pause";
  event?: string;
  closeVisible?: boolean;
  source?: string;
  linkIndex?: number;
  hitAreas?: Array<{ event: string; frame: FlowFrame }>;
  slotVisibility?: Record<string, boolean>;
  on?: Record<string, string>;
};

type GeneratedFlowConfig = {
  version: number;
  entry: string;
  animations: Record<string, string>;
  nodes: FlowConfigNode[];
  transitions: Array<Record<string, unknown>>;
  designWidth?: number;
  designHeight?: number;
  closeButton?: { frame: FlowFrame };
};

type CachedZipResult = {
  cacheId: string;
  filename: string;
  totalSize: number;
  expiresAt: number;
};

type ImageConvertTargetFormat = "png" | "jpeg" | "webp";

type ImageCrawlMode = "page" | "list";

type ImageCrawlResult = CachedZipResult & {
  progressId?: string;
  imageCount: number;
  checkedCount: number;
  skippedCount: number;
};

type ImageCrawlProgress = {
  progressId: string;
  phase: "idle" | "fetching-page" | "extracting" | "downloading" | "zipping" | "done" | "error" | "cancelled";
  current: number;
  total: number;
  savedCount: number;
  skippedCount: number;
  message: string;
  updatedAt: number;
};

type ImageConvertResult = CachedZipResult & {
  fileCount: number;
  convertedCount: number;
  sourceFormats: string[];
  targetFormat: ImageConvertTargetFormat;
};

type ImageConvertProgress = {
  current: number;
  total: number;
  message: string;
};

const IMAGE_TARGET_MIME_TYPES: Record<ImageConvertTargetFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

const IMAGE_TARGET_EXTENSIONS: Record<ImageConvertTargetFormat, string> = {
  png: "png",
  jpeg: "jpg",
  webp: "webp",
};

const KNOWN_IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg", "avif"]);

function getFileExtension(filename: string) {
  const matched = filename.toLowerCase().match(/\.([a-z0-9]+)$/i);
  return matched?.[1] ?? "";
}

function isLikelyImageFile(file: File) {
  return file.type.startsWith("image/") || KNOWN_IMAGE_EXTENSIONS.has(getFileExtension(file.name));
}

function detectImageFileFormat(file: File) {
  const mime = file.type.toLowerCase();
  if (mime === "image/jpeg") return "JPEG";
  if (mime === "image/png") return "PNG";
  if (mime === "image/webp") return "WEBP";
  if (mime === "image/gif") return "GIF";
  if (mime === "image/bmp") return "BMP";
  if (mime === "image/svg+xml") return "SVG";
  if (mime === "image/avif") return "AVIF";
  const ext = getFileExtension(file.name);
  if (ext === "jpg" || ext === "jpeg") return "JPEG";
  if (ext) return ext.toUpperCase();
  return "UNKNOWN";
}

function buildConvertedImageName(filename: string, targetFormat: ImageConvertTargetFormat) {
  const extension = IMAGE_TARGET_EXTENSIONS[targetFormat];
  const basename = filename.replace(/\.[^/.]+$/, "") || "image";
  return `${basename}.${extension}`;
}

function createUniqueFilename(filename: string, usedNames: Set<string>) {
  if (!usedNames.has(filename)) {
    usedNames.add(filename);
    return filename;
  }

  const matched = filename.match(/^(.*?)(\.[^.]+)?$/);
  const basename = matched?.[1] || "file";
  const extension = matched?.[2] || "";
  let index = 2;
  let candidate = `${basename}-${index}${extension}`;
  while (usedNames.has(candidate)) {
    index += 1;
    candidate = `${basename}-${index}${extension}`;
  }
  usedNames.add(candidate);
  return candidate;
}

async function loadImageElementFromFile(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("image_load_failed"));
      element.src = objectUrl;
    });
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function convertImageFile(
  file: File,
  targetFormat: ImageConvertTargetFormat,
  quality: number,
) {
  const image = await loadImageElementFromFile(file);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) {
    throw new Error("invalid_image_size");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("canvas_not_supported");
  }

  if (targetFormat === "jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
  } else {
    context.clearRect(0, 0, width, height);
  }
  context.drawImage(image, 0, 0, width, height);

  const mimeType = IMAGE_TARGET_MIME_TYPES[targetFormat];
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => {
        if (!value) {
          reject(new Error("image_export_failed"));
          return;
        }
        resolve(value);
      },
      mimeType,
      targetFormat === "png" ? undefined : quality,
    );
  });

  if (blob.type && blob.type !== mimeType) {
    throw new Error(`unsupported_target_${targetFormat}`);
  }

  return new File([blob], buildConvertedImageName(file.name, targetFormat), {
    type: mimeType,
    lastModified: Date.now(),
  });
}

function createDefaultFlowConfigForm(): FlowConfigFormModel {
  return {
    templateId: "scenario3",
    enableCloseButton: false,
    closeButtonFrame: { x: 331, y: 80, w: 28, h: 28 },
    closeVisiblePolicy: "wait_only",
    customCloseVisible: {},
    actionType: "primary",
    actionSource: "primary",
    actionLinkIndex: 0,
    afterPrimaryAction: "dismiss",
    firstClickBehavior: "goto_next_segment",
    firstClickLinkIndex: 0,
    useHitAreas: false,
    hitAreas: [],
    nonTap: "",
    tapLoop: "",
    nonTap1: "",
    tapLoop1: "",
    nonTap2: "",
    tapLoop2: "",
    frontAnimation: "",
    rearAnimation: "",
    designWidth: 375,
    designHeight: 812,
    missingAnimationFallback: "next_segment",
    customRuntimeSource: "",
  };
}

function toSafeNumber(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function resolveCloseVisible(
  form: FlowConfigFormModel,
  nodeId: string,
  nodeType: FlowConfigNode["type"]
) {
  if (form.closeVisiblePolicy === "always_hidden") return false;
  if (form.closeVisiblePolicy === "always_show") return true;
  if (form.closeVisiblePolicy === "wait_only") return nodeType === "wait_event" || nodeType === "ui";
  return !!form.customCloseVisible[nodeId];
}

function buildActionNode(
  id: string,
  source: string,
  actionType: ActionType,
  actionLinkIndex: number,
  completedTarget: string,
  actionFailedTarget: string,
  closeVisible: boolean
): FlowConfigNode {
  return {
    id,
    type: "action",
    source: source || "primary",
    ...(actionType === "linkIndex" ? { linkIndex: actionLinkIndex } : {}),
    closeVisible,
    on: {
      completed: completedTarget,
      action_failed: actionFailedTarget,
    },
  };
}

function addAnimation(
  animations: Record<string, string>,
  key: string,
  filename: string
) {
  if (!filename) return;
  animations[key] = filename;
}

function createHitArea() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    eventName: "tap_btn_1",
    frame: { x: 0, y: 0, w: 100, h: 40 },
    targetType: "route_primary" as HitAreaTargetType,
    targetLinkIndex: 0,
  };
}

function validateFlowConfigObject(
  config: unknown,
  uploadedFileNames: string[]
): string[] {
  const errors: string[] = [];
  if (!config || typeof config !== "object") {
    return ["flowConfig 不是合法对象"];
  }
  const typed = config as Partial<GeneratedFlowConfig>;
  if (typeof typed.version !== "number") errors.push("version 必须是 number");
  if (typeof typed.entry !== "string" || !typed.entry) errors.push("entry 必须是非空字符串");
  if (!typed.animations || typeof typed.animations !== "object") errors.push("animations 必须是对象");
  if (!Array.isArray(typed.nodes)) errors.push("nodes 必须是数组");
  if (!Array.isArray(typed.transitions)) errors.push("transitions 必须是数组");
  if (errors.length > 0) return errors;

  const nodes = typed.nodes as FlowConfigNode[];
  const nodeIds = new Set(nodes.map((node) => node.id));
  if (!nodeIds.has(typed.entry as string)) {
    errors.push(`entry 指向的节点不存在: ${typed.entry}`);
  }

  const animations = typed.animations as Record<string, string>;
  const uploadedSet = new Set(uploadedFileNames);
  const hitAreaEvents = new Set<string>();
  for (const node of nodes) {
    if (node.type === "animation") {
      const key = node.animation;
      if (!key || !animations[key]) {
        errors.push(`动画节点 ${node.id} 引用的 animations key 不存在: ${String(key)}`);
      } else if (!uploadedSet.has(animations[key])) {
        errors.push(`animations.${key} 对应文件不存在于上传列表: ${animations[key]}`);
      }
    }
    if (node.hitAreas) {
      for (const area of node.hitAreas) {
        const frame = area.frame;
        if (
          !Number.isFinite(frame.x) ||
          !Number.isFinite(frame.y) ||
          !Number.isFinite(frame.w) ||
          !Number.isFinite(frame.h) ||
          frame.w <= 0 ||
          frame.h <= 0
        ) {
          errors.push(`节点 ${node.id} 的热区 ${area.event} 坐标不合法`);
        }
        if (hitAreaEvents.has(area.event)) {
          errors.push(`热区事件名重复: ${area.event}`);
        } else {
          hitAreaEvents.add(area.event);
        }
      }
    }
  }
  return errors;
}

function generateFlowConfigFromForm(form: FlowConfigFormModel): GeneratedFlowConfig {
  const animations: Record<string, string> = {};
  const nodes: FlowConfigNode[] = [];
  const holdNodeId = "hold_for_next";
  const dismissNodeId = "dismiss";

  const pushDismiss = () => {
    if (!nodes.find((node) => node.id === dismissNodeId)) {
      nodes.push({ id: dismissNodeId, type: "dismiss" });
    }
  };

  const ensureHoldNode = () => {
    if (!nodes.find((node) => node.id === holdNodeId)) {
      nodes.push({
        id: holdNodeId,
        type: "ui",
        closeVisible: resolveCloseVisible(form, holdNodeId, "ui"),
      });
    }
  };

  const primaryCompletedTarget = form.afterPrimaryAction === "hold" ? holdNodeId : dismissNodeId;
  const actionFailedDefault = dismissNodeId;
  const missingAnimTarget = form.missingAnimationFallback === "dismiss" ? dismissNodeId : ""; // "" means fill per-segment

  const buildWaitNode = (
    id: string,
    fallbackTarget: string,
    gotoNextSegmentId: string | null
  ) => {
    const closeVisible = resolveCloseVisible(form, id, "wait_event");
    const on: Record<string, string> = {};
    const hitAreas: Array<{ event: string; frame: FlowFrame }> = [];
    const extraNodes: FlowConfigNode[] = [];

    const resolveTarget = (targetType: HitAreaTargetType, linkIndex: number, idx: number) => {
      if (targetType === "dismiss") return dismissNodeId;
      if (targetType === "goto_next_segment") return gotoNextSegmentId || fallbackTarget;
      const actionNodeId = `${id}_action_${idx + 1}`;
      extraNodes.push(
        buildActionNode(
          actionNodeId,
          "primary",
          targetType === "route_linkIndex" ? "linkIndex" : "primary",
          linkIndex,
          primaryCompletedTarget,
          actionFailedDefault,
          resolveCloseVisible(form, actionNodeId, "action")
        )
      );
      return actionNodeId;
    };

    if (form.useHitAreas && form.hitAreas.length > 0) {
      form.hitAreas.forEach((area, idx) => {
        on[area.eventName] = resolveTarget(area.targetType, area.targetLinkIndex, idx);
        hitAreas.push({
          event: area.eventName,
          frame: {
            x: toSafeNumber(area.frame.x, 0),
            y: toSafeNumber(area.frame.y, 0),
            w: toSafeNumber(area.frame.w, 0),
            h: toSafeNumber(area.frame.h, 0),
          },
        });
      });
      return {
        node: {
          id,
          type: "wait_event",
          slot: "interactive",
          closeVisible,
          hitAreas,
          on,
        } as FlowConfigNode,
        extraNodes,
      };
    }

    on.tap_interactive = fallbackTarget;
    return {
      node: {
        id,
        type: "wait_event",
        event: "tap_interactive",
        closeVisible,
        on,
      } as FlowConfigNode,
      extraNodes,
    };
  };

  // add a single animation node
  function addSegmentAnimation(
    id: string,
    animationKey: string,
    slot: "display" | "interactive",
    endPolicy: "disappear" | "loop" | "pause",
    completedTarget: string,
    missingAnimTarget: string,
    closeVisible: boolean
  ) {
    nodes.push({
      id,
      type: "animation",
      animation: animationKey,
      slot,
      endPolicy,
      closeVisible,
      on: {
        completed: completedTarget,
        missing_animation: missingAnimTarget,
      },
    });
  }

  // entry helper: returns the first node ID a segment should start at
  const segmentEntry = (nonTapFile: string, nonTapId: string, tapLoopId: string) =>
    nonTapFile ? nonTapId : tapLoopId;

  // animation segment helper: adds nonTap (optional) + tapLoop pair for one segment
  const pushSegmentPair = (
    nonTapId: string,
    tapLoopId: string,
    nonTapAnimKey: string,
    tapLoopAnimKey: string,
    nonTapFile: string,
    tapLoopTarget: string
  ) => {
    const missingTarget = missingAnimTarget || tapLoopId;
    if (nonTapFile) {
      addSegmentAnimation(
        nonTapId, nonTapAnimKey, "display", "disappear",
        tapLoopId, missingTarget,
        resolveCloseVisible(form, nonTapId, "animation")
      );
    }
    addSegmentAnimation(
      tapLoopId, tapLoopAnimKey, "interactive", "loop",
      tapLoopTarget, dismissNodeId,
      resolveCloseVisible(form, tapLoopId, "animation")
    );
  };

  // build main action node helper
  const pushMainAction = (
    actionId: string,
    sourceOverride?: string
  ) => {
    const source = sourceOverride ?? (form.actionSource === "custom_runtime" && form.customRuntimeSource ? form.customRuntimeSource : form.actionSource);
    nodes.push(
      buildActionNode(
        actionId,
        source,
        form.actionType,
        form.actionLinkIndex,
        primaryCompletedTarget,
        actionFailedDefault,
        resolveCloseVisible(form, actionId, "action")
      )
    );
  };

  // =========================================================
  // TEMPLATE: scenario1 — type 4 (nonTap only, no click)
  // =========================================================
  if (form.templateId === "scenario1") {
    addAnimation(animations, "nonTap", form.nonTap);
    const segTarget = form.afterPrimaryAction === "hold" ? holdNodeId : dismissNodeId;
    const missTarget = missingAnimTarget || segTarget;
    addSegmentAnimation(
      "segment_non_tap", "nonTap", "display", "disappear",
      segTarget, missTarget,
      resolveCloseVisible(form, "segment_non_tap", "animation")
    );
  }

  // =========================================================
  // TEMPLATE: scenario2 — type 3 (tapLoop only)
  // =========================================================
  if (form.templateId === "scenario2") {
    addAnimation(animations, "tapLoop", form.tapLoop);
    addSegmentAnimation(
      "segment_tap_loop", "tapLoop", "interactive", "loop",
      "wait_tap", dismissNodeId,
      resolveCloseVisible(form, "segment_tap_loop", "animation")
    );
    pushMainAction("action_primary");
    const waitBuilt = buildWaitNode("wait_tap", "action_primary", null);
    nodes.push(waitBuilt.node, ...waitBuilt.extraNodes);
  }

  // =========================================================
  // TEMPLATE: scenario3 — type 1/2 (nonTap → tapLoop)
  // =========================================================
  if (form.templateId === "scenario3") {
    addAnimation(animations, "nonTap", form.nonTap);
    addAnimation(animations, "tapLoop", form.tapLoop);
    pushSegmentPair(
      "segment_non_tap", "segment_tap_loop",
      "nonTap", "tapLoop",
      form.nonTap, "wait_tap"
    );
    pushMainAction("action_primary");
    const waitBuilt = buildWaitNode("wait_tap", "action_primary", null);
    nodes.push(waitBuilt.node, ...waitBuilt.extraNodes);
  }

  // =========================================================
  // TEMPLATE: scenario4 — type 5 (two segments, A click→B)
  // =========================================================
  if (form.templateId === "scenario4") {
    addAnimation(animations, "nonTap1", form.nonTap1);
    addAnimation(animations, "tapLoop1", form.tapLoop1);
    addAnimation(animations, "nonTap2", form.nonTap2);
    addAnimation(animations, "tapLoop2", form.tapLoop2);

    const seg2FirstId = form.nonTap2 ? "segment2_non_tap" : "segment2_tap_loop";

    pushSegmentPair(
      "segment1_non_tap", "segment1_tap_loop",
      "nonTap1", "tapLoop1",
      form.nonTap1, "wait1_tap"
    );

    // A段点击→进入B段（goto_next_segment），不执行跳转
    const wait1Built = buildWaitNode("wait1_tap", seg2FirstId, seg2FirstId);
    nodes.push(wait1Built.node, ...wait1Built.extraNodes);

    pushSegmentPair(
      "segment2_non_tap", "segment2_tap_loop",
      "nonTap2", "tapLoop2",
      form.nonTap2, "wait2_tap"
    );
    pushMainAction("action_primary");
    const wait2Built = buildWaitNode("wait2_tap", "action_primary", null);
    nodes.push(wait2Built.node, ...wait2Built.extraNodes);
  }

  // =========================================================
  // TEMPLATE: scenario5 — type 6 (A full then B full)
  // =========================================================
  if (form.templateId === "scenario5") {
    addAnimation(animations, "nonTap1", form.nonTap1);
    addAnimation(animations, "tapLoop1", form.tapLoop1);
    addAnimation(animations, "nonTap2", form.nonTap2);
    addAnimation(animations, "tapLoop2", form.tapLoop2);

    const seg2FirstId = form.nonTap2 ? "segment2_non_tap" : "segment2_tap_loop";

    pushSegmentPair(
      "segment1_non_tap", "segment1_tap_loop",
      "nonTap1", "tapLoop1",
      form.nonTap1, "wait1_tap"
    );

    // A段点击行为可配置：跳转链接 / 进B段 / 关闭
    let firstClickTarget: string;
    const firstClickBehaviorId = "goto_next_action";
    if (form.firstClickBehavior === "dismiss") {
      firstClickTarget = dismissNodeId;
    } else if (form.firstClickBehavior === "route_primary" || form.firstClickBehavior === "route_linkIndex") {
      nodes.push(
        buildActionNode(
          firstClickBehaviorId,
          "primary",
          form.firstClickBehavior === "route_linkIndex" ? "linkIndex" : "primary",
          form.firstClickLinkIndex,
          seg2FirstId,
          actionFailedDefault,
          resolveCloseVisible(form, firstClickBehaviorId, "action")
        )
      );
      firstClickTarget = firstClickBehaviorId;
    } else {
      firstClickTarget = seg2FirstId;
    }

    const wait1Built = buildWaitNode("wait1_tap", firstClickTarget, seg2FirstId);
    nodes.push(wait1Built.node, ...wait1Built.extraNodes);

    pushSegmentPair(
      "segment2_non_tap", "segment2_tap_loop",
      "nonTap2", "tapLoop2",
      form.nonTap2, "wait2_tap"
    );
    pushMainAction("action2_primary");
    const wait2Built = buildWaitNode("wait2_tap", "action2_primary", null);
    nodes.push(wait2Built.node, ...wait2Built.extraNodes);
  }

  // =========================================================
  // TEMPLATE: scenario6 — type 7 (front/rear transition animation)
  // =========================================================
  if (form.templateId === "scenario6_front_rear") {
    addAnimation(animations, "frontAnimation", form.frontAnimation);
    addAnimation(animations, "nonTap", form.nonTap);
    addAnimation(animations, "tapLoop", form.tapLoop);
    addAnimation(animations, "rearAnimation", form.rearAnimation);

    const missFront = missingAnimTarget || (form.nonTap ? "segment_non_tap" : "segment_tap_loop");
    addSegmentAnimation(
      "segment_front", "frontAnimation", "display", "disappear",
      form.nonTap ? "segment_non_tap" : "segment_tap_loop",
      missFront,
      resolveCloseVisible(form, "segment_front", "animation")
    );

    pushSegmentPair(
      "segment_non_tap", "segment_tap_loop",
      "nonTap", "tapLoop",
      form.nonTap, "wait_tap"
    );

    const hideInteractId = "hide_interactive_layer";
    nodes.push({
      id: hideInteractId,
      type: "ui",
      slotVisibility: { interactive: false },
      closeVisible: resolveCloseVisible(form, hideInteractId, "ui"),
      on: { completed: "segment_rear" },
    });

    pushMainAction("action_primary");
    const waitBuilt = buildWaitNode("wait_tap", "action_primary", null);
    nodes.push(waitBuilt.node, ...waitBuilt.extraNodes);

    // Override primary action's completed target to go to hide → rear
    const primaryAction = nodes.find((n) => n.id === "action_primary");
    if (primaryAction?.on) {
      primaryAction.on.completed = hideInteractId;
    }

    const missRear = missingAnimTarget || dismissNodeId;
    addSegmentAnimation(
      "segment_rear", "rearAnimation", "display", "disappear",
      dismissNodeId, missRear,
      resolveCloseVisible(form, "segment_rear", "animation")
    );
  }

  // =========================================================
  // TEMPLATE: scenario7 — type 8 (runtime dynamic link)
  // =========================================================
  if (form.templateId === "scenario7_runtime_link") {
    addAnimation(animations, "nonTap", form.nonTap);
    addAnimation(animations, "tapLoop", form.tapLoop);

    const runtimeSource = form.actionSource === "custom_runtime" && form.customRuntimeSource
      ? form.customRuntimeSource
      : form.actionSource;
    const isPromo = runtimeSource === "promo_response";
    const runtimeEvent = isPromo ? "promo_received" : "runtime_received";
    const runtimeFailedEvent = isPromo ? "promo_failed" : "runtime_failed";

    pushSegmentPair(
      "segment_non_tap", "segment_tap_loop",
      "nonTap", "tapLoop",
      form.nonTap, "wait_tap"
    );

    const triggerActionId = "trigger_runtime_request";
    const runtimeActionId = "action_with_runtime_link";

    // action that triggers the runtime request (e.g. promo route)
    nodes.push(
      buildActionNode(
        triggerActionId,
        "primary",
        "primary",
        0,
        "wait_tap",    // 回到wait继续等待
        "wait_tap",
        resolveCloseVisible(form, triggerActionId, "action")
      )
    );

    // action that reads runtime link from cache
    nodes.push(
      buildActionNode(
        runtimeActionId,
        runtimeSource,
        form.actionType,
        form.actionLinkIndex,
        primaryCompletedTarget,
        actionFailedDefault,
        resolveCloseVisible(form, runtimeActionId, "action")
      )
    );

    // wait_event listens for both tap and runtime events
    const waitCloseVisible = resolveCloseVisible(form, "wait_tap", "wait_event");
    const waitOn: Record<string, string> = {
      tap_interactive: triggerActionId,
      [runtimeEvent]: runtimeActionId,
    };
    if (runtimeFailedEvent) {
      waitOn[runtimeFailedEvent] = dismissNodeId;
    }

    if (form.useHitAreas && form.hitAreas.length > 0) {
      const hitAreas: Array<{ event: string; frame: FlowFrame }> = [];
      form.hitAreas.forEach((area) => {
        waitOn[area.eventName] = triggerActionId;
        hitAreas.push({
          event: area.eventName,
          frame: {
            x: toSafeNumber(area.frame.x, 0),
            y: toSafeNumber(area.frame.y, 0),
            w: toSafeNumber(area.frame.w, 0),
            h: toSafeNumber(area.frame.h, 0),
          },
        });
      });
      nodes.push({
        id: "wait_tap",
        type: "wait_event",
        slot: "interactive",
        closeVisible: waitCloseVisible,
        hitAreas,
        on: waitOn,
      });
    } else {
      nodes.push({
        id: "wait_tap",
        type: "wait_event",
        event: "tap_interactive",
        closeVisible: waitCloseVisible,
        on: waitOn,
      });
    }
  }

  // =========================================================
  // TEMPLATE: custom — basic tapLoop → wait → action
  // =========================================================
  if (form.templateId === "custom") {
    addAnimation(animations, "tapLoop", form.tapLoop);
    addSegmentAnimation(
      "segment_tap_loop", "tapLoop", "interactive", "loop",
      "wait_tap", dismissNodeId,
      resolveCloseVisible(form, "segment_tap_loop", "animation")
    );
    pushMainAction("action_primary");
    const waitBuilt = buildWaitNode("wait_tap", "action_primary", null);
    nodes.push(waitBuilt.node, ...waitBuilt.extraNodes);
  }

  if (form.afterPrimaryAction === "hold") {
    ensureHoldNode();
  }
  pushDismiss();

  const entryLookup: Record<FlowTemplateId, string> = {
    scenario1: "segment_non_tap",
    scenario2: "segment_tap_loop",
    scenario3: segmentEntry(form.nonTap, "segment_non_tap", "segment_tap_loop"),
    scenario4: segmentEntry(form.nonTap1, "segment1_non_tap", "segment1_tap_loop"),
    scenario5: segmentEntry(form.nonTap1, "segment1_non_tap", "segment1_tap_loop"),
    scenario6_front_rear: form.frontAnimation ? "segment_front" : segmentEntry(form.nonTap, "segment_non_tap", "segment_tap_loop"),
    scenario7_runtime_link: segmentEntry(form.nonTap, "segment_non_tap", "segment_tap_loop"),
    custom: "segment_tap_loop",
  };

  const config: GeneratedFlowConfig = {
    version: 1,
    entry: entryLookup[form.templateId] ?? "segment_tap_loop",
    animations,
    nodes,
    transitions: [],
    ...(form.designWidth && form.designHeight
      ? { designWidth: form.designWidth, designHeight: form.designHeight }
      : {}),
    ...(form.enableCloseButton
      ? {
          closeButton: {
            frame: {
              x: form.closeButtonFrame.x,
              y: form.closeButtonFrame.y,
              w: form.closeButtonFrame.w,
              h: form.closeButtonFrame.h,
            },
          },
        }
      : {}),
  };

  return config;
}
 
export default function MoreFeatures() {
   const pathname = usePathname() || "/";
   const isEN = pathname.startsWith("/en");
   const router = useRouter();
   const [open, setOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState<null | "domain" | "lan" | "base64" | "repo" | "escape" | "imageCrawler" | "imageConvert" | "compress" | "siteSettings">(null);
   const [input, setInput] = useState("");
   const [result, setResult] = useState<string | null>(null);
   const [copied, setCopied] = useState(false);
  const [lanHost, setLanHost] = useState("192.168.201.30");
  const [lanPort, setLanPort] = useState("3000");
  const [lanMsg, setLanMsg] = useState("");
  const [lanFrom, setLanFrom] = useState("蒙帅帅");
  const [lanToken, setLanToken] = useState("lan-chat-token-2026");
  const [lanConfigOpen, setLanConfigOpen] = useState(false);
  const [lanSending, setLanSending] = useState(false);
  const [lanResp, setLanResp] = useState<string | null>(null);
  type LanMsg = { id: string; ts: number; method: "GET" | "POST"; msg: string; from: string };
  const [lanInbox, setLanInbox] = useState<LanMsg[]>([]);
  const [lanInboxBusy, setLanInboxBusy] = useState(false);
  const [lanAutoDownloadLogs, setLanAutoDownloadLogs] = useState<Record<string, string>>({});
  const lanKnownIdsRef = useRef<Set<string>>(new Set());
  const lanAutoDownloadedIdsRef = useRef<Set<string>>(new Set());
  const lanProcessingRef = useRef<Set<string>>(new Set());
  const lanClientIdRef = useRef<string>("");
  if (typeof window !== "undefined" && !lanClientIdRef.current) {
    let clientId = window.sessionStorage.getItem("lan-client-id");
    if (!clientId) {
      clientId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      window.sessionStorage.setItem("lan-client-id", clientId);
    }
    lanClientIdRef.current = clientId;
  }
  const [lanNotifyPermission, setLanNotifyPermission] = useState<"unsupported" | NotificationPermission>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission;
  });
  const [b64Mode, setB64Mode] = useState<"encode" | "decode">("decode");
  const [b64Charset, setB64Charset] = useState("utf-8");
  const [b64Input, setB64Input] = useState("");
  const [b64Output, setB64Output] = useState<string | null>(null);
  const [repoInput, setRepoInput] = useState("");
  const [repoOutput, setRepoOutput] = useState<string | null>(null);
  const [repoCopied, setRepoCopied] = useState(false);
  const [escapeInput, setEscapeInput] = useState("");
  const [escapeOutput, setEscapeOutput] = useState<string | null>(null);
  const [imageCrawlMode, setImageCrawlMode] = useState<ImageCrawlMode>("page");
  const [imageCrawlPageUrl, setImageCrawlPageUrl] = useState("");
  const [imageCrawlListText, setImageCrawlListText] = useState("");
  const [imageCrawlSameOriginOnly, setImageCrawlSameOriginOnly] = useState(false);
  const [imageCrawlFormats, setImageCrawlFormats] = useState<string[]>(["jpg", "png", "webp"]);
  const [imageCrawlAspectRatios, setImageCrawlAspectRatios] = useState<string[]>([]);
  const [imageCrawlExactSizesText, setImageCrawlExactSizesText] = useState("");
  const [imageCrawlLimit, setImageCrawlLimit] = useState(20);
  const [imageCrawlFilename, setImageCrawlFilename] = useState("");
  const [imageCrawlAutoDownload, setImageCrawlAutoDownload] = useState(false);
  const [imageCrawlStatus, setImageCrawlStatus] = useState<"idle" | "crawling" | "ready" | "error">("idle");
  const [imageCrawlResult, setImageCrawlResult] = useState<ImageCrawlResult | null>(null);
  const [imageCrawlExpiryTime, setImageCrawlExpiryTime] = useState<number | null>(null);
  const [imageCrawlError, setImageCrawlError] = useState<string | null>(null);
  const [imageCrawlProgress, setImageCrawlProgress] = useState<ImageCrawlProgress | null>(null);
  const imageCrawlAbortRef = useRef<AbortController | null>(null);
  const imageCrawlProgressIdRef = useRef<string | null>(null);
  const imageCrawlAutoDownloadingCacheIdRef = useRef<string | null>(null);
  const imageCrawlAutoDownloadedCacheIdRef = useRef<string | null>(null);
  const imageConvertTaskIdRef = useRef(0);
  const [imageConvertFiles, setImageConvertFiles] = useState<File[]>([]);
  const [imageConvertTargetFormat, setImageConvertTargetFormat] = useState<ImageConvertTargetFormat>("png");
  const [imageConvertQuality, setImageConvertQuality] = useState(0.92);
  const [imageConvertZipFilename, setImageConvertZipFilename] = useState("");
  const [imageConvertStatus, setImageConvertStatus] = useState<"idle" | "converting" | "uploading" | "ready" | "error">("idle");
  const [imageConvertResult, setImageConvertResult] = useState<ImageConvertResult | null>(null);
  const [imageConvertExpiryTime, setImageConvertExpiryTime] = useState<number | null>(null);
  const [imageConvertError, setImageConvertError] = useState<string | null>(null);
  const [imageConvertProgress, setImageConvertProgress] = useState<ImageConvertProgress | null>(null);
  const [compressFiles, setCompressFiles] = useState<File[]>([]);
  const [compressStatus, setCompressStatus] = useState<'idle' | 'uploading' | 'compressing' | 'ready' | 'error'>('idle');
  const [compressResult, setCompressResult] = useState<{ cacheId: string; filename: string; fileCount: number; totalSize: number; createdAt: number } | null>(null);
  const [compressExpiryTime, setCompressExpiryTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [compressError, setCompressError] = useState<string | null>(null);
  const [compressWizardStep, setCompressWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [zipFilename, setZipFilename] = useState('');
  const [flowConfigEditorOpen, setFlowConfigEditorOpen] = useState(false);
  const [flowConfigWizardStep, setFlowConfigWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [flowConfigForm, setFlowConfigForm] = useState<FlowConfigFormModel>(() => createDefaultFlowConfigForm());
  const [flowConfigConfigured, setFlowConfigConfigured] = useState(false);
  const [flowConfigErrors, setFlowConfigErrors] = useState<string[]>([]);
  const [flowConfigManualMode, setFlowConfigManualMode] = useState(false);
  const [flowConfigManualText, setFlowConfigManualText] = useState("");
  const [flowConfigManualError, setFlowConfigManualError] = useState<string | null>(null);
  const imageFormatOptions = useMemo(
    () => [
      { value: "jpg", label: "JPG" },
      { value: "jpeg", label: "JPEG" },
      { value: "png", label: "PNG" },
      { value: "webp", label: "WEBP" },
      { value: "gif", label: "GIF" },
      { value: "bmp", label: "BMP" },
      { value: "svg", label: "SVG" },
      { value: "avif", label: "AVIF" },
    ],
    [],
  );
  const imageAspectRatioOptions = useMemo(
    () => [
      { value: "1:1", label: "1:1" },
      { value: "9:16", label: "9:16" },
      { value: "16:9", label: "16:9" },
      { value: "3:4", label: "3:4" },
      { value: "4:3", label: "4:3" },
      { value: "2:3", label: "2:3" },
    ],
    [],
  );
  const imageConvertTargetOptions = useMemo(
    () => [
      { value: "png" as const, label: "PNG" },
      { value: "jpeg" as const, label: "JPG" },
      { value: "webp" as const, label: "WEBP" },
    ],
    [],
  );
  const charsets = useMemo(
    () => [
      { label: "UTF-8", value: "utf-8" },
      { label: "GBK", value: "gbk" },
      { label: "GB18030", value: "gb18030" },
      { label: "Big5", value: "big5" },
      { label: "Shift_JIS", value: "shift_jis" },
      { label: "ISO-8859-1", value: "iso-8859-1" },
      { label: "Windows-1252", value: "windows-1252" },
    ],
    [],
  );
  const uploadedJsonFileNames = useMemo(
    () => Array.from(new Set(compressFiles.map((file) => file.name))),
    [compressFiles]
  );
  const autoFlowConfigObject = useMemo(
    () => generateFlowConfigFromForm(flowConfigForm),
    [flowConfigForm]
  );
  const autoFlowConfigText = useMemo(
    () => JSON.stringify(autoFlowConfigObject, null, 2),
    [autoFlowConfigObject]
  );
  const closeVisibleNodeIds = useMemo(
    () => Array.from(new Set(autoFlowConfigObject.nodes.map((node) => node.id))),
    [autoFlowConfigObject]
  );
  const flowConfigPreviewText = flowConfigManualMode ? flowConfigManualText : autoFlowConfigText;
  const imageCrawlInProgressView = imageCrawlStatus === "crawling" || imageCrawlStatus === "error" || !!imageCrawlResult;
  const imageCrawlProgressPercent = imageCrawlProgress?.total
    ? Math.max(4, Math.min(100, Math.round((imageCrawlProgress.current / imageCrawlProgress.total) * 100)))
    : 12;
  const imageConvertInProgressView =
    imageConvertStatus === "converting" || imageConvertStatus === "uploading" || imageConvertStatus === "error" || !!imageConvertResult;
  const imageConvertProgressPercent = imageConvertProgress?.total
    ? Math.max(6, Math.min(100, Math.round((imageConvertProgress.current / imageConvertProgress.total) * 100)))
    : 10;
  const imageConvertDetectedFormats = useMemo(
    () => Array.from(new Set(imageConvertFiles.map((file) => detectImageFileFormat(file)))),
    [imageConvertFiles],
  );

  function markFlowConfigDirty() {
    setFlowConfigConfigured(false);
    setFlowConfigErrors([]);
    setFlowConfigManualError(null);
  }

  function updateFlowConfigForm(patch: Partial<FlowConfigFormModel>) {
    setFlowConfigForm((prev) => ({ ...prev, ...patch }));
    markFlowConfigDirty();
  }

  function applyTemplateDefaults(templateId: FlowTemplateId) {
    const defaults = createDefaultFlowConfigForm();
    if (templateId === "scenario1") {
      updateFlowConfigForm({
        ...defaults,
        templateId,
        nonTap: uploadedJsonFileNames[0] ?? "",
      });
      return;
    }
    if (templateId === "scenario2") {
      updateFlowConfigForm({
        ...defaults,
        templateId,
        tapLoop: uploadedJsonFileNames[0] ?? "",
      });
      return;
    }
    if (templateId === "scenario3") {
      updateFlowConfigForm({
        ...defaults,
        templateId,
        nonTap: uploadedJsonFileNames[0] ?? "",
        tapLoop: uploadedJsonFileNames[1] ?? uploadedJsonFileNames[0] ?? "",
      });
      return;
    }
    if (templateId === "scenario4" || templateId === "scenario5") {
      updateFlowConfigForm({
        ...defaults,
        templateId,
        nonTap1: uploadedJsonFileNames[0] ?? "",
        tapLoop1: uploadedJsonFileNames[1] ?? uploadedJsonFileNames[0] ?? "",
        nonTap2: uploadedJsonFileNames[2] ?? "",
        tapLoop2: uploadedJsonFileNames[3] ?? uploadedJsonFileNames[2] ?? "",
      });
      return;
    }
    if (templateId === "scenario6_front_rear") {
      updateFlowConfigForm({
        ...defaults,
        templateId,
        frontAnimation: uploadedJsonFileNames[0] ?? "",
        nonTap: uploadedJsonFileNames[1] ?? "",
        tapLoop: uploadedJsonFileNames[2] ?? uploadedJsonFileNames[1] ?? "",
        rearAnimation: uploadedJsonFileNames[3] ?? uploadedJsonFileNames[2] ?? "",
      });
      return;
    }
    if (templateId === "scenario7_runtime_link") {
      updateFlowConfigForm({
        ...defaults,
        templateId,
        actionSource: "promo_response",
        nonTap: uploadedJsonFileNames[0] ?? "",
        tapLoop: uploadedJsonFileNames[1] ?? uploadedJsonFileNames[0] ?? "",
      });
      return;
    }
    updateFlowConfigForm({
      ...defaults,
      templateId,
      tapLoop: uploadedJsonFileNames[0] ?? "",
    });
  }

  function addHitAreaItem() {
    const nextIndex = flowConfigForm.hitAreas.length + 1;
    const nextArea = createHitArea();
    nextArea.eventName = `tap_btn_${nextIndex}`;
    updateFlowConfigForm({
      hitAreas: [...flowConfigForm.hitAreas, nextArea],
    });
  }

  function removeHitAreaItem(id: string) {
    updateFlowConfigForm({
      hitAreas: flowConfigForm.hitAreas.filter((item) => item.id !== id),
    });
  }

  function updateHitAreaItem(id: string, patch: Partial<FlowHitAreaForm>) {
    updateFlowConfigForm({
      hitAreas: flowConfigForm.hitAreas.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    });
  }

  function getFlowConfigPayload() {
    if (flowConfigManualMode) {
      const text = flowConfigManualText.trim();
      if (!text) {
        return { payload: null, errors: [isEN ? "Advanced JSON cannot be empty" : "高级编辑 JSON 不能为空"] };
      }
      try {
        const parsed = JSON.parse(text);
        const errors = validateFlowConfigObject(parsed, uploadedJsonFileNames);
        return { payload: JSON.stringify(parsed), errors };
      } catch {
        return { payload: null, errors: [isEN ? "Advanced JSON is invalid" : "高级编辑 JSON 格式不合法"] };
      }
    }
    const errors = validateFlowConfigObject(autoFlowConfigObject, uploadedJsonFileNames);
    return { payload: JSON.stringify(autoFlowConfigObject), errors };
  }
  function getCookie(name: string) {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }
  function setCookie(name: string, value: string, days: number) {
    if (typeof document === "undefined") return;
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/; SameSite=Lax`;
  }
  const [last, setLast] = useState<string | null>(() => {
    try {
      const fromCookie = getCookie("domainGenLast");
      if (fromCookie) return fromCookie;
      return typeof window !== "undefined" ? window.localStorage.getItem("domainGenLast") : null;
    } catch {
      return null;
    }
  });
 
   const baseDomains = useMemo(() => [
    "xtools.top", 
    "soulmater.top",
    "doubleskill.top",
    "rampagee.top",
    "nebulabyte.top",
    "codefusion.top"
  ], []);
  const features = useMemo(
    () =>
      [
        {
          id: "domain" as const,
          title: isEN ? "Generate Domain" : "生成域名",
          desc: isEN
            ? "Enter a subdomain; rotates through preset bases."
            : "输入三级域名；按预设二级域名顺序循环输出。",
          icon: <Globe className="h-5 w-5" />,
        },
        {
          id: "lan" as const,
          title: isEN ? "LAN Message" : "局域网消息",
          desc: isEN ? "Send a message to LAN IP." : "给局域网 IP 发送消息。",
          icon: <Send className="h-5 w-5" />,
        },
        {
          id: "base64" as const,
          title: isEN ? "Base64" : "Base64解析",
          desc: isEN ? "Encode/decode with charset." : "按字符集进行编码/解码。",
          icon: <Code className="h-5 w-5" />,
        },
        {
          id: "repo" as const,
          title: isEN ? "GitHub URL" : "GitHub地址补齐",
          desc: isEN ? "Generate webappbox repo URL." : "输入仓库名自动补齐 GitHub 地址。",
          icon: <Link2 className="h-5 w-5" />,
        },
        {
          id: "escape" as const,
          title: isEN ? "Escape Decode" : "转义还原",
          desc: isEN ? "Decode escaped JSON/link text." : "把转义 JSON/链接内容还原为可读格式。",
          icon: <Code className="h-5 w-5" />,
        },
        {
          id: "imageConvert" as const,
          title: isEN ? "Image Format Convert" : "图片格式转换",
          desc: isEN ? "Batch convert images to one chosen format and pack ZIP." : "批量识别图片原格式，统一转换后打包 ZIP。",
          icon: <ImageIcon className="h-5 w-5" />,
        },
        {
          id: "imageCrawler" as const,
          title: isEN ? "Image Crawl ZIP" : "图片抓取打包",
          desc: isEN ? "Collect page images or URL lists into one ZIP." : "抓取网页图片或链接列表，自动打包 ZIP。",
          icon: <ImageIcon className="h-5 w-5" />,
        },
        {
          id: "compress" as const,
          title: isEN ? "Dynamic Popup File Compress" : "动态弹窗文件压缩",
          desc: isEN ? "Drag files to create downloadable zip." : "拖拽文件生成可下载的压缩包。",
          icon: <FileArchive className="h-5 w-5" />,
        },
        {
          id: "siteSettings" as const,
          title: isEN ? "Site Settings" : "站点信息配置",
          desc: isEN ? "Configure site name, owner and links." : "配置站名、所有者、标语和链接。",
          icon: <SlidersHorizontal className="h-5 w-5" />,
        },
      ],
    [isEN],
  );
 
   function nextIndex(current: number) {
     const len = baseDomains.length;
     return len === 0 ? 0 : (current + 1) % len;
   }
 
   function parseIndex(v: string | null) {
     const n = Number(v);
     return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
   }
 
   function handleGenerate(e: React.FormEvent) {
     e.preventDefault();
     const sub = input.trim().toLowerCase();
     if (!sub) return;
     const idx = parseIndex(typeof window !== "undefined" ? window.localStorage.getItem("domainGenIndex") : "0");
     const base = baseDomains[idx % baseDomains.length];
     const domain = `${sub}.${base}`;
     setResult(domain);
     try {
       window.localStorage.setItem("domainGenIndex", String(nextIndex(idx)));
     } catch {}
   }
 
   function copyText(text: string) {
     const textarea = document.createElement("textarea");
     textarea.value = text;
     textarea.setAttribute("readonly", "true");
     textarea.style.position = "fixed";
     textarea.style.opacity = "0";
     document.body.appendChild(textarea);
     textarea.select();
     const ok = document.execCommand("copy");
     document.body.removeChild(textarea);
     return ok;
   }

  function saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

   async function handleCopy() {
     if (!result) return;
     const text = result;
     try {
       if (navigator.clipboard?.writeText) {
         await navigator.clipboard.writeText(text);
       } else if (!copyText(text)) {
         return;
       }
     } catch {
       if (!copyText(text)) {
         return;
       }
     }
    setLast(text);
    try {
      window.localStorage.setItem("domainGenLast", text);
    } catch {}
    try {
      setCookie("domainGenLast", text, 3650);
    } catch {}
     setCopied(true);
     window.setTimeout(() => setCopied(false), 1200);
   }
 
   function close() {
     setOpen(false);
    setActiveFeature(null);
     setInput("");
     setResult(null);
     setCopied(false);
    setB64Input("");
    setB64Output(null);
    setRepoInput("");
    setRepoOutput(null);
    setRepoCopied(false);
    setEscapeInput("");
    setEscapeOutput(null);
   setLanConfigOpen(false);
   }
 
  function bytesToBase64(arr: Uint8Array) {
    let s = "";
    for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
    return btoa(s);
  }

  function base64ToBytes(b64: string) {
    return Uint8Array.from(Buffer.from(b64, "base64"));
  }

  function normalizeBase64Input(raw: string) {
    let v = raw.trim();
    const md5Pos = v.search(/\s+md5:/i);
    if (md5Pos > 0) v = v.slice(0, md5Pos).trim();
    v = v.replace(/\s+/g, "");
    v = v.replace(/-/g, "+").replace(/_/g, "/");
    const mod = v.length % 4;
    if (mod !== 0) v += "=".repeat(4 - mod);
    return v;
  }

  function isValidBase64(v: string) {
    if (!v) return false;
    if (v.length % 4 !== 0) return false;
    return /^[A-Za-z0-9+/]*={0,2}$/.test(v);
  }

  function encodeTextToBytes(text: string, charset: string) {
    if (charset.toLowerCase() === "utf-8") return new TextEncoder().encode(text);
    try {
      const u8 = iconvLite.encode(text, charset);
      return u8 instanceof Uint8Array ? u8 : Uint8Array.from(u8 as unknown as ArrayLike<number>);
    } catch {
      return new TextEncoder().encode(text);
    }
  }

  function decodeBytesToText(bytes: Uint8Array, charset: string) {
    try {
      const dec = new TextDecoder(charset);
      return dec.decode(bytes);
    } catch {
      try {
        return iconvLite.decode(Buffer.from(bytes), charset);
      } catch {
        return new TextDecoder().decode(bytes);
      }
    }
  }

  function handleB64Convert(e: React.FormEvent) {
    e.preventDefault();
    const v = b64Input;
    if (!v) return;
    if (b64Mode === "encode") {
      const bytes = encodeTextToBytes(v, b64Charset);
      const out = bytesToBase64(bytes);
      setB64Output(out);
      return;
    }
    const normalized = normalizeBase64Input(v);
    if (!isValidBase64(normalized)) {
      setB64Output(isEN ? "Invalid base64" : "Base64 无效");
      return;
    }
    try {
      const bytes = base64ToBytes(normalized);
      const out = decodeBytesToText(bytes, b64Charset);
      setB64Output(out);
    } catch {
      setB64Output(isEN ? "Invalid base64" : "Base64 无效");
    }
  }

  async function handleB64Copy() {
    if (!b64Output) return;
    const text = b64Output;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (!copyText(text)) {
        return;
      }
    } catch {
      if (!copyText(text)) {
        return;
      }
    }
  }

  const formattedB64Output = useMemo(() => {
    if (!b64Output) return null;
    if (b64Mode !== "decode") return b64Output;
    try {
      const parsed = JSON.parse(b64Output);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return b64Output;
    }
  }, [b64Output, b64Mode]);

  function decodeEscapedText(raw: string) {
    let current = raw;
    for (let i = 0; i < 3; i++) {
      let next = current;
      try {
        next = decodeURIComponent(current);
      } catch {}
      if (next === current) break;
      current = next;
    }
    if (/[\\][nrt"\\]/.test(current)) {
      current = current
        .replace(/\\r/g, "\r")
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, "\"")
        .replace(/\\\\/g, "\\");
    }
    return current;
  }

  function tryParseJsonText(v: string) {
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  }

  function parseSearchParamsLoose(rawQuery: string) {
    const params = new Map<string, string[]>();
    let queryForSplit = rawQuery;
    // Some deep-links encode the whole query once, e.g. data%3D%7B...%7D.
    // Decode only one layer before split, to avoid breaking nested "&" inside JSON values.
    if (!queryForSplit.includes("=") && /%3D/i.test(queryForSplit)) {
      try {
        queryForSplit = decodeURIComponent(queryForSplit);
      } catch {}
    }
    const parts = queryForSplit.split("&");
    for (const part of parts) {
      if (!part) continue;
      const eq = part.indexOf("=");
      const rawKey = eq >= 0 ? part.slice(0, eq) : part;
      const rawValue = eq >= 0 ? part.slice(eq + 1) : "";
      const key = decodeEscapedText(rawKey);
      const value = decodeEscapedText(rawValue);
      const prev = params.get(key) ?? [];
      prev.push(value);
      params.set(key, prev);
    }
    return params;
  }

  function parseUrlJsonParam(s: string): null | { url: string; params: Record<string, unknown> } {
    if (!s.includes("://") || !s.includes("?")) return null;
    const qIndex = s.indexOf("?");
    const baseUrl = qIndex >= 0 ? s.slice(0, qIndex) : s;
    const query = qIndex >= 0 ? s.slice(qIndex + 1) : "";
    const params: Record<string, unknown> = {};
    let hasJsonParam = false;
    const candidates = new Set(["data", "payload", "params", "query"]);
    const decodedOnceMap = parseSearchParamsLoose(query);

    for (const [key, values] of decodedOnceMap.entries()) {
      const value = values[0] ?? "";
      if (candidates.has(key) && /^\s*[\{\[]/.test(value)) {
        const parsed = tryParseJsonText(value);
        if (parsed !== null) {
          params[key] = normalizeEscapedValue(parsed);
          hasJsonParam = true;
          continue;
        }
      }
      params[key] = value;
    }

    return hasJsonParam ? { url: baseUrl, params } : null;
  }

  function normalizeEscapedValue(value: unknown): unknown {
    if (typeof value === "string") {
      const urlParsedRaw = parseUrlJsonParam(value);
      if (urlParsedRaw) {
        return urlParsedRaw;
      }
      const decoded = decodeEscapedText(value);
      const parsed = tryParseJsonText(decoded);
      if (parsed !== null) {
        return normalizeEscapedValue(parsed);
      }
      const urlParsed = parseUrlJsonParam(decoded);
      if (urlParsed) {
        return urlParsed;
      }
      return decoded;
    }
    if (Array.isArray(value)) {
      return value.map((item) => normalizeEscapedValue(item));
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, normalizeEscapedValue(v)]),
      );
    }
    return value;
  }

  function handleEscapeDecode(e: React.FormEvent) {
    e.preventDefault();
    const raw = escapeInput.trim();
    if (!raw) return;
    const parsedInput = tryParseJsonText(raw);
    if (parsedInput !== null) {
      const normalized = normalizeEscapedValue(parsedInput);
      setEscapeOutput(JSON.stringify(normalized, null, 2));
      return;
    }
    const decoded = decodeEscapedText(raw);
    if (!decoded.includes("://")) {
      const eqIndex = decoded.indexOf("=");
      if (eqIndex > 0) {
        const key = decoded.slice(0, eqIndex).trim();
        const valuePart = decoded.slice(eqIndex + 1).trim();
        if (/^[A-Za-z0-9_]+$/.test(key)) {
          const valueDecoded = decodeEscapedText(valuePart);
          if (/^\s*[\{\[]/.test(valueDecoded)) {
            const parsed = tryParseJsonText(valueDecoded);
            if (parsed !== null) {
              setEscapeOutput(`${key}=\n${JSON.stringify(normalizeEscapedValue(parsed), null, 2)}`);
              return;
            }
          }
        }
      }
    }
    const urlParsed = parseUrlJsonParam(decoded);
    if (urlParsed) {
      setEscapeOutput(`${urlParsed.url}\n\n${JSON.stringify(urlParsed.params, null, 2)}`);
      return;
    }
    setEscapeOutput(decoded);
  }

  async function handleEscapeCopy() {
    if (!escapeOutput) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(escapeOutput);
      } else {
        copyText(escapeOutput);
      }
    } catch {
      copyText(escapeOutput);
    }
  }

  async function releaseImageCrawlCache(cacheId?: string) {
    if (!cacheId) return;
    try {
      await fetch(`/api/image-crawl?id=${encodeURIComponent(cacheId)}`, {
        method: "DELETE",
      });
    } catch {}
  }

  async function releaseImageCrawlProgress(progressId?: string) {
    if (!progressId) return;
    try {
      await fetch(`/api/image-crawl?progressId=${encodeURIComponent(progressId)}`, {
        method: "DELETE",
      });
    } catch {}
  }

  function toggleImageCrawlFormat(format: string) {
    setImageCrawlFormats((prev) =>
      prev.includes(format) ? prev.filter((item) => item !== format) : [...prev, format],
    );
  }

  function toggleImageCrawlAspectRatio(ratio: string) {
    setImageCrawlAspectRatios((prev) =>
      prev.includes(ratio) ? prev.filter((item) => item !== ratio) : [...prev, ratio],
    );
  }

  function parseExactSizeFilters(text: string) {
    return text
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => /^\d+\s*[x*]\s*\d+$/i.test(item));
  }

  async function handleImageCrawlSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (imageCrawlFormats.length === 0) {
      setImageCrawlStatus("error");
      setImageCrawlError(isEN ? "Please select at least one format" : "请至少选择一种图片格式");
      return;
    }
    if (imageCrawlMode === "page" && !imageCrawlPageUrl.trim()) {
      setImageCrawlStatus("error");
      setImageCrawlError(isEN ? "Please enter a page URL" : "请输入网页地址");
      return;
    }
    if (imageCrawlMode === "list" && !imageCrawlListText.trim()) {
      setImageCrawlStatus("error");
      setImageCrawlError(isEN ? "Please paste image URLs" : "请粘贴图片链接");
      return;
    }
    const exactSizeFilters = parseExactSizeFilters(imageCrawlExactSizesText);
    if (imageCrawlExactSizesText.trim() && exactSizeFilters.length === 0) {
      setImageCrawlStatus("error");
      setImageCrawlError(isEN ? "Exact sizes must look like 1024*1024 or 1080x1920" : "指定尺寸请按 1024*1024 或 1080x1920 这种格式填写");
      return;
    }

    await releaseImageCrawlCache(imageCrawlResult?.cacheId);
    await releaseImageCrawlProgress(imageCrawlProgressIdRef.current ?? imageCrawlResult?.progressId);
    imageCrawlAbortRef.current?.abort();
    const controller = new AbortController();
    const progressId = crypto.randomUUID();
    imageCrawlAbortRef.current = controller;
    imageCrawlProgressIdRef.current = progressId;
    setImageCrawlStatus("crawling");
    setImageCrawlError(null);
    setImageCrawlResult(null);
    setImageCrawlExpiryTime(null);
    setImageCrawlProgress({
      progressId,
      phase: "idle",
      current: 0,
      total: 0,
      savedCount: 0,
      skippedCount: 0,
      message: isEN ? "Task created" : "任务已创建",
      updatedAt: Date.now(),
    });

    try {
      const response = await fetch("/api/image-crawl", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: imageCrawlMode,
          pageUrl: imageCrawlPageUrl.trim(),
          listText: imageCrawlListText,
          sameOriginOnly: imageCrawlMode === "page" ? imageCrawlSameOriginOnly : false,
          formats: imageCrawlFormats,
          aspectRatios: imageCrawlAspectRatios,
          exactSizes: exactSizeFilters,
          limit: imageCrawlLimit,
          filename: imageCrawlFilename.trim(),
          progressId,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || (isEN ? "Image crawl failed" : "图片抓取失败"));
      }

      const now = Date.now();
      setImageCrawlResult(data as ImageCrawlResult);
      setImageCrawlExpiryTime(typeof data?.expiresAt === "number" ? data.expiresAt : now + 5 * 60 * 1000);
      setCurrentTime(now);
      setImageCrawlStatus("ready");
    } catch (error) {
      setImageCrawlStatus("error");
      if (error instanceof DOMException && error.name === "AbortError") {
        setImageCrawlError(isEN ? "Crawl cancelled and cleaned up" : "抓取已结束并清理完成");
      } else {
        setImageCrawlError(error instanceof Error ? error.message : isEN ? "Image crawl failed" : "图片抓取失败");
      }
    } finally {
      if (imageCrawlAbortRef.current === controller) {
        imageCrawlAbortRef.current = null;
      }
    }
  }

  async function handleAbortImageCrawl() {
    imageCrawlAbortRef.current?.abort();
    imageCrawlAbortRef.current = null;
    await releaseImageCrawlCache(imageCrawlResult?.cacheId);
    await releaseImageCrawlProgress(imageCrawlProgressIdRef.current ?? imageCrawlResult?.progressId);
    imageCrawlProgressIdRef.current = null;
    setImageCrawlStatus("idle");
    setImageCrawlResult(null);
    setImageCrawlExpiryTime(null);
    setImageCrawlProgress(null);
    setImageCrawlError(isEN ? "Crawl cancelled and cleaned up" : "抓取已结束并清理完成");
  }

  const handleImageCrawlDownload = useCallback(async (options?: { silent?: boolean }): Promise<boolean> => {
    if (!imageCrawlResult) return false;
    try {
      if (!options?.silent) {
        setImageCrawlError(null);
      }
      const response = await fetch(`/api/image-crawl?id=${encodeURIComponent(imageCrawlResult.cacheId)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || (isEN ? "Download failed" : "下载失败"));
      }
      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error(isEN ? "Downloaded file is empty" : "下载文件为空");
      }
      saveBlob(blob, imageCrawlResult.filename);
      return true;
    } catch (error) {
      setImageCrawlError(error instanceof Error ? error.message : isEN ? "Download failed" : "下载失败");
      return false;
    }
  }, [imageCrawlResult, isEN]);

  function handleImageCrawlReset() {
    imageCrawlAbortRef.current?.abort();
    imageCrawlAbortRef.current = null;
    void releaseImageCrawlCache(imageCrawlResult?.cacheId);
    void releaseImageCrawlProgress(imageCrawlProgressIdRef.current ?? imageCrawlResult?.progressId);
    imageCrawlProgressIdRef.current = null;
    setImageCrawlMode("page");
    setImageCrawlPageUrl("");
    setImageCrawlListText("");
    setImageCrawlSameOriginOnly(false);
    setImageCrawlFormats(["jpg", "png", "webp"]);
    setImageCrawlAspectRatios([]);
    setImageCrawlExactSizesText("");
    setImageCrawlLimit(20);
    setImageCrawlFilename("");
    setImageCrawlAutoDownload(false);
    setImageCrawlStatus("idle");
    setImageCrawlResult(null);
    setImageCrawlExpiryTime(null);
    setImageCrawlProgress(null);
    setImageCrawlError(null);
    imageCrawlAutoDownloadingCacheIdRef.current = null;
    imageCrawlAutoDownloadedCacheIdRef.current = null;
  }

  useEffect(() => {
    if (imageCrawlStatus !== "crawling") {
      return;
    }
    const progressId = imageCrawlProgressIdRef.current;
    if (!progressId) {
      return;
    }

    let cancelled = false;
    const tick = async () => {
      try {
        const response = await fetch(`/api/image-crawl?progressId=${encodeURIComponent(progressId)}`, {
          cache: "no-store",
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || cancelled || !data) return;
        setImageCrawlProgress(data as ImageCrawlProgress);
      } catch {}
    };

    void tick();
    const timer = window.setInterval(() => {
      void tick();
    }, 700);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [imageCrawlStatus]);

  useEffect(() => {
    if (!imageCrawlAutoDownload || imageCrawlStatus !== "ready" || !imageCrawlResult) {
      return;
    }
    const cacheId = imageCrawlResult.cacheId;
    if (
      imageCrawlAutoDownloadingCacheIdRef.current === cacheId ||
      imageCrawlAutoDownloadedCacheIdRef.current === cacheId
    ) {
      return;
    }

    imageCrawlAutoDownloadingCacheIdRef.current = cacheId;
    void handleImageCrawlDownload({ silent: true }).then((ok) => {
      if (ok) {
        imageCrawlAutoDownloadedCacheIdRef.current = cacheId;
      }
      if (imageCrawlAutoDownloadingCacheIdRef.current === cacheId) {
        imageCrawlAutoDownloadingCacheIdRef.current = null;
      }
    });
  }, [handleImageCrawlDownload, imageCrawlAutoDownload, imageCrawlStatus, imageCrawlResult]);

  function filterJsonFiles(files: File[]) {
    const validFiles = files.filter((file) => file.name.toLowerCase().endsWith(".json"));
    const invalidCount = files.length - validFiles.length;
    return { validFiles, invalidCount };
  }

  function handleCompressDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const { validFiles, invalidCount } = filterJsonFiles(files);
      if (invalidCount > 0) {
        setCompressError(
          isEN
            ? `Only JSON files are allowed. Skipped ${invalidCount} file(s).`
            : `仅支持 JSON 文件，已跳过 ${invalidCount} 个非 JSON 文件。`
        );
      } else {
        setCompressError(null);
      }
      if (validFiles.length > 0) {
        setCompressFiles(prevFiles => [...prevFiles, ...validFiles]);
        setFlowConfigConfigured(false);
      }
      setCompressStatus('idle');
    }
  }

  function handleCompressDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleCompressFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const { validFiles, invalidCount } = filterJsonFiles(files);
      if (invalidCount > 0) {
        setCompressError(
          isEN
            ? `Only JSON files are allowed. Skipped ${invalidCount} file(s).`
            : `仅支持 JSON 文件，已跳过 ${invalidCount} 个非 JSON 文件。`
        );
      } else {
        setCompressError(null);
      }
      if (validFiles.length > 0) {
        setCompressFiles(prevFiles => [...prevFiles, ...validFiles]);
        setFlowConfigConfigured(false);
      }
      setCompressStatus('idle');
    }
    // 重置input以便可以再次选择相同文件
    e.target.value = '';
  }

  function filterImageFiles(files: File[]) {
    const validFiles = files.filter((file) => isLikelyImageFile(file));
    const invalidCount = files.length - validFiles.length;
    return { validFiles, invalidCount };
  }

  function handleImageConvertDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) {
      return;
    }
    const { validFiles, invalidCount } = filterImageFiles(files);
    if (invalidCount > 0) {
      setImageConvertError(
        isEN
          ? `Only image files are supported. Skipped ${invalidCount} file(s).`
          : `仅支持图片文件，已跳过 ${invalidCount} 个非图片文件。`,
      );
    } else {
      setImageConvertError(null);
    }
    if (validFiles.length > 0) {
      setImageConvertFiles((prevFiles) => [...prevFiles, ...validFiles]);
      setImageConvertStatus("idle");
      setImageConvertResult(null);
      setImageConvertExpiryTime(null);
    }
  }

  function handleImageConvertDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleImageConvertFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const { validFiles, invalidCount } = filterImageFiles(files);
      if (invalidCount > 0) {
        setImageConvertError(
          isEN
            ? `Only image files are supported. Skipped ${invalidCount} file(s).`
            : `仅支持图片文件，已跳过 ${invalidCount} 个非图片文件。`,
        );
      } else {
        setImageConvertError(null);
      }
      if (validFiles.length > 0) {
        setImageConvertFiles((prevFiles) => [...prevFiles, ...validFiles]);
        setImageConvertStatus("idle");
        setImageConvertResult(null);
        setImageConvertExpiryTime(null);
      }
    }
    e.target.value = "";
  }

  async function handleImageConvertSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (imageConvertFiles.length === 0) {
      setImageConvertError(isEN ? "Please select images first" : "请先选择图片");
      return;
    }

    const taskId = imageConvertTaskIdRef.current + 1;
    imageConvertTaskIdRef.current = taskId;
    setImageConvertStatus("converting");
    setImageConvertError(null);
    setImageConvertResult(null);
    setImageConvertExpiryTime(null);
    setImageConvertProgress({
      current: 0,
      total: imageConvertFiles.length,
      message: isEN ? "Preparing image conversion..." : "准备开始图片转换...",
    });

    try {
      const convertedFiles: File[] = [];
      const sourceFormatSet = new Set<string>();
      const usedNames = new Set<string>();

      for (let index = 0; index < imageConvertFiles.length; index += 1) {
        if (imageConvertTaskIdRef.current !== taskId) {
          return;
        }

        const file = imageConvertFiles[index];
        sourceFormatSet.add(detectImageFileFormat(file));
        setImageConvertProgress({
          current: index,
          total: imageConvertFiles.length,
          message: isEN ? `Converting ${file.name}` : `正在转换 ${file.name}`,
        });
        const convertedFile = await convertImageFile(file, imageConvertTargetFormat, imageConvertQuality);
        const uniqueName = createUniqueFilename(convertedFile.name, usedNames);
        const normalizedFile =
          uniqueName === convertedFile.name
            ? convertedFile
            : new File([convertedFile], uniqueName, {
                type: convertedFile.type,
                lastModified: convertedFile.lastModified,
              });
        convertedFiles.push(normalizedFile);
        setImageConvertProgress({
          current: index + 1,
          total: imageConvertFiles.length,
          message: isEN ? `Converted ${index + 1}/${imageConvertFiles.length}` : `已完成 ${index + 1}/${imageConvertFiles.length}`,
        });
      }

      if (imageConvertTaskIdRef.current !== taskId) {
        return;
      }

      setImageConvertStatus("uploading");
      setImageConvertProgress({
        current: imageConvertFiles.length,
        total: imageConvertFiles.length,
        message: isEN ? "Uploading ZIP package..." : "正在上传 ZIP 包...",
      });

      const formData = new FormData();
      convertedFiles.forEach((file) => {
        formData.append("files", file);
      });
      if (imageConvertZipFilename.trim()) {
        formData.append("filename", imageConvertZipFilename.trim());
      }

      const response = await fetch("/api/compress", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || (isEN ? "ZIP creation failed" : "ZIP 生成失败"));
      }

      const data = await response.json();
      if (imageConvertTaskIdRef.current !== taskId) {
        return;
      }

      const now = Date.now();
      setImageConvertResult({
        ...(data as CachedZipResult & { fileCount: number }),
        convertedCount: convertedFiles.length,
        sourceFormats: Array.from(sourceFormatSet),
        targetFormat: imageConvertTargetFormat,
      });
      setImageConvertExpiryTime(typeof data?.expiresAt === "number" ? data.expiresAt : now + 5 * 60 * 1000);
      setCurrentTime(now);
      setImageConvertStatus("ready");
      setImageConvertProgress(null);
    } catch (error) {
      if (imageConvertTaskIdRef.current !== taskId) {
        return;
      }
      const message = error instanceof Error ? error.message : "";
      let readableMessage = message;
      if (message === "canvas_not_supported") {
        readableMessage = isEN ? "Current browser does not support canvas export" : "当前浏览器不支持 Canvas 导出";
      } else if (message === "image_load_failed") {
        readableMessage = isEN ? "Some images could not be loaded" : "部分图片无法读取";
      } else if (message === "invalid_image_size") {
        readableMessage = isEN ? "Some images have invalid dimensions" : "部分图片尺寸无效";
      } else if (message === "image_export_failed") {
        readableMessage = isEN ? "Image export failed" : "图片导出失败";
      } else if (message.startsWith("unsupported_target_")) {
        const format = message.replace("unsupported_target_", "").toUpperCase();
        readableMessage = isEN ? `Current browser cannot export ${format}` : `当前浏览器不支持导出 ${format}`;
      }
      setImageConvertStatus("error");
      setImageConvertError(readableMessage || (isEN ? "Image conversion failed" : "图片转换失败"));
    }
  }

  async function handleImageConvertDownload() {
    if (!imageConvertResult) {
      return;
    }

    try {
      setImageConvertError(null);
      const response = await fetch(`/api/compress?id=${imageConvertResult.cacheId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const detail = errorData?.error || `HTTP ${response.status}`;
        throw new Error(isEN ? `Download failed: ${detail}` : `下载失败：${detail}`);
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error(isEN ? "Downloaded ZIP is empty" : "下载的 ZIP 为空");
      }

      saveBlob(blob, imageConvertResult.filename);
    } catch (error) {
      setImageConvertError(error instanceof Error ? error.message : isEN ? "Download failed" : "下载失败");
    }
  }

  function handleImageConvertReset() {
    imageConvertTaskIdRef.current += 1;
    setImageConvertFiles([]);
    setImageConvertZipFilename("");
    setImageConvertStatus("idle");
    setImageConvertResult(null);
    setImageConvertExpiryTime(null);
    setImageConvertError(null);
    setImageConvertProgress(null);
    setImageConvertQuality(0.92);
    setImageConvertTargetFormat("png");
  }

  async function handleCompressSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (compressFiles.length === 0) {
      setCompressError(isEN ? 'Please select files' : '请选择文件');
      return;
    }
    if (!flowConfigConfigured) {
      setCompressError(isEN ? "Please configure flowConfig first" : "请先配置 flowConfig");
      return;
    }

    setCompressStatus('uploading');
    setCompressError(null);

    try {
      const formData = new FormData();
      compressFiles.forEach(file => {
        formData.append('files', file);
      });
      
      // 添加自定义文件名（如果有）
      if (zipFilename.trim()) {
        formData.append('filename', zipFilename.trim());
      }

      // 添加flowConfig配置
      formData.append('addFlowConfig', 'true');
      const payload = getFlowConfigPayload();
      if (payload.errors.length > 0 || !payload.payload) {
        setFlowConfigErrors(payload.errors);
        setFlowConfigConfigured(false);
        setCompressStatus('error');
        setCompressError(isEN ? "flowConfig validation failed" : "flowConfig 校验失败");
        return;
      }
      formData.append('flowConfigContent', payload.payload);

      const response = await fetch('/api/compress', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || (isEN ? 'Compression failed' : '压缩失败'));
      }

      const result = await response.json();
      const resultWithTime = {
        ...result,
        createdAt: Date.now()
      };
      const now = Date.now();
      setCompressResult(resultWithTime);
      setCompressExpiryTime(now + 5 * 60 * 1000); // 5分钟后过期
      setCurrentTime(now); // 立即更新当前时间，确保倒计时从正确值开始
      setCompressStatus('ready');
    } catch (error) {
      setCompressStatus('error');
      setCompressError(error instanceof Error ? error.message : isEN ? 'Unknown error' : '未知错误');
    }
  }

  async function handleCompressDownload() {
    if (!compressResult) return;

    try {
      setCompressError(null);
      const response = await fetch(`/api/compress?id=${compressResult.cacheId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const detail =
          errorData?.error ||
          (isEN ? `HTTP ${response.status}` : `HTTP ${response.status}`);
        throw new Error(
          isEN
            ? `Download failed: ${detail}`
            : `下载失败：${detail}`
        );
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error(isEN ? "Downloaded file is empty" : "下载文件为空");
      }

      saveBlob(blob, compressResult.filename);
    } catch (error) {
      setCompressError(error instanceof Error ? error.message : isEN ? "Download failed" : "下载失败");
    }
  }

  function handleCompressReset() {
    setCompressFiles([]);
    setCompressStatus('idle');
    setCompressResult(null);
    setCompressExpiryTime(null);
    setCompressError(null);
    setCompressWizardStep(1);
    setFlowConfigConfigured(false);
    setFlowConfigErrors([]);
    setFlowConfigManualError(null);
    setFlowConfigEditorOpen(false);
    setFlowConfigWizardStep(1);
  }

  function handleSaveFlowConfig() {
    const payload = getFlowConfigPayload();
    if (payload.errors.length > 0) {
      setFlowConfigConfigured(false);
      setFlowConfigErrors(payload.errors);
      setCompressError(payload.errors[0] ?? (isEN ? "flowConfig invalid" : "flowConfig 不合法"));
      return;
    }
    setFlowConfigConfigured(true);
    setFlowConfigErrors([]);
    setFlowConfigEditorOpen(false);
    setCompressError(null);
  }

  useEffect(() => {
    if (!compressExpiryTime && !imageCrawlExpiryTime && !imageConvertExpiryTime) {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);

      if (compressExpiryTime && now >= compressExpiryTime) {
        setCompressStatus("idle");
        setCompressResult(null);
        setCompressExpiryTime(null);
        setCompressError(isEN ? "Compressed file has expired. Please compress again." : "压缩文件已过期，请重新压缩。");
      }

      if (imageCrawlExpiryTime && now >= imageCrawlExpiryTime) {
        setImageCrawlStatus("idle");
        setImageCrawlResult(null);
        setImageCrawlExpiryTime(null);
        setImageCrawlError(isEN ? "Image ZIP has expired. Please crawl again." : "图片 ZIP 已过期，请重新抓取。");
      }

      if (imageConvertExpiryTime && now >= imageConvertExpiryTime) {
        setImageConvertStatus("idle");
        setImageConvertResult(null);
        setImageConvertExpiryTime(null);
        setImageConvertError(isEN ? "Converted ZIP has expired. Please convert again." : "转换后的 ZIP 已过期，请重新转换。");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [compressExpiryTime, imageCrawlExpiryTime, imageConvertExpiryTime, isEN]);

  function handleRepoBuild(e: React.FormEvent) {
    e.preventDefault();
    const name = repoInput.trim();
    if (!name) return;
    setRepoOutput(`https://github.com/webappbox/${name}.git`);
  }

  async function handleRepoCopy() {
    if (!repoOutput) return;
    let copiedOk = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(repoOutput);
        copiedOk = true;
      } else {
        copiedOk = copyText(repoOutput);
      }
    } catch {
      copiedOk = copyText(repoOutput);
    }
    if (!copiedOk) return;
    setRepoCopied(true);
    window.setTimeout(() => setRepoCopied(false), 2500);
  }

  async function handleLanSend(e: React.FormEvent) {
    e.preventDefault();
    setLanResp(null);
    const host = lanHost.trim();
    const port = Number.parseInt(lanPort.trim(), 10);
    const msg = lanMsg;
    const from = lanFrom.trim() || "gotyourfiles";
    const authToken = lanToken.trim();
    if (!host || !Number.isFinite(port) || !msg) return;
    setLanSending(true);
    try {
      const res = await fetch("/api/lan/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ host, port, msg, from, authToken }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setLanResp(isEN ? "Sent" : "已发送");
      } else {
        const remoteStatus = data?.remoteStatus ? ` remote=${data.remoteStatus}` : "";
        const detail = data?.remoteData?.error ? ` ${String(data.remoteData.error)}` : "";
        const hint = data?.hint ? ` ${String(data.hint)}` : "";
        const code = data?.causeCode ? ` ${String(data.causeCode)}` : "";
        const extraDetail = data?.detail ? ` ${String(data.detail)}` : "";
        const hostPort = data?.host && data?.port ? ` ${String(data.host)}:${String(data.port)}` : "";
        setLanResp(
          (isEN ? "Failed: " : "失败：") +
            String(data?.error ?? res.status) +
            remoteStatus +
            detail +
            hint +
            code +
            extraDetail +
            hostPort
        );
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      setLanResp((isEN ? "Error: " : "错误：") + m);
    } finally {
      setLanSending(false);
    }
  }

  const processLanIncomingMessage = useCallback(async (m: LanMsg) => {
    if (lanKnownIdsRef.current.has(m.id)) {
      return;
    }
    lanKnownIdsRef.current.add(m.id);
    setLanInbox((prev) => {
      const next = [...prev, m].sort((a, b) => a.ts - b.ts);
      return next.length > 100 ? next.slice(next.length - 100) : next;
    });
    if (typeof window !== "undefined" && "Notification" in window && lanNotifyPermission === "granted") {
      const title = isEN ? "New LAN message" : "新的局域网消息";
      const body = `${m.from || (isEN ? "unknown" : "未知")}: ${m.msg}`;
      new Notification(title, { body, tag: `lan-${m.id}` });
    }
    if (lanAutoDownloadedIdsRef.current.has(m.id)) {
      return;
    }
    const isLocalHost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "[::1]");
    if (!isLocalHost) {
      setLanAutoDownloadLogs((prev) => ({
        ...prev,
        [m.id]: isEN ? "Auto download: not host machine" : "自动下载：非本机，跳过",
      }));
      return;
    }
    if (lanProcessingRef.current.has(m.id)) {
      return;
    }
    lanProcessingRef.current.add(m.id);
    try {
      const messageStatus = extractLanMessageStatus(m.msg);
      if (shouldSkipLanAutoDownloadByStatus(messageStatus)) {
        setLanAutoDownloadLogs((prev) => ({
          ...prev,
          [m.id]: (isEN ? "Auto download: skipped -> status " : "自动下载：已跳过 -> 状态 ") + messageStatus,
        }));
        return;
      }
      const task = parseLanAutoDownloadTask(m.msg);
      if (task) {
        try {
          const reserveRes = await fetch("/api/lan/inbox", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "try-reserve-download", messageId: m.id, clientId: lanClientIdRef.current }),
          });
          const reserveData = await reserveRes.json().catch(() => ({ reserved: false }));
          if (!reserveData.reserved) {
            setLanAutoDownloadLogs((prev) => ({
              ...prev,
              [m.id]: (isEN ? "Auto download: already handled by another device" : "自动下载：已被其他设备处理"),
            }));
            return;
          }
          setLanAutoDownloadLogs((prev) => ({
            ...prev,
            [m.id]: isEN ? "Auto download: downloading..." : "自动下载：下载中...",
          }));
          await downloadLanAutoFile(task);
          lanAutoDownloadedIdsRef.current.add(m.id);
          setLanAutoDownloadLogs((prev) => ({
            ...prev,
            [m.id]: (isEN ? "Auto download: success -> " : "自动下载：成功 -> ") + task.fileName,
          }));
          setLanResp((isEN ? "Auto downloaded: " : "已自动下载：") + task.fileName);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          setLanAutoDownloadLogs((prev) => ({
            ...prev,
            [m.id]: (isEN ? "Auto download: failed -> " : "自动下载：失败 -> ") + message,
          }));
          setLanResp((isEN ? "Auto download failed: " : "自动下载失败：") + message);
        }
        return;
      }
      setLanAutoDownloadLogs((prev) => ({
        ...prev,
        [m.id]: isEN ? "Auto download: rule not matched" : "自动下载：规则未匹配",
      }));
    } finally {
      lanProcessingRef.current.delete(m.id);
    }
  }, [isEN, lanNotifyPermission]);

  const fetchInbox = useCallback(async () => {
    setLanInboxBusy(true);
    try {
      const res = await fetch("/api/lan/inbox");
      const data = await res.json().catch(() => null);
      const list = Array.isArray(data?.messages) ? data.messages as LanMsg[] : [];
      const serverDownloaded = Array.isArray(data?.autoDownloadedIds) ? data.autoDownloadedIds as string[] : [];
      for (const id of serverDownloaded) {
        lanAutoDownloadedIdsRef.current.add(id);
      }
      for (const m of list) {
        lanKnownIdsRef.current.add(m.id);
      }
      setLanInbox(list);
    } finally {
      setLanInboxBusy(false);
    }
  }, []);

  const handleLanNotifyAction = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setLanNotifyPermission("unsupported");
      setLanResp(isEN ? "Notification is not supported." : "当前浏览器不支持通知。");
      return;
    }
    if (Notification.permission === "granted") {
      setLanNotifyPermission("granted");
      new Notification(isEN ? "LAN notification test" : "局域网通知测试", {
        body: isEN ? "Notification is enabled." : "通知已开启。",
        tag: "lan-notify-test",
      });
      setLanResp(isEN ? "Notification test sent." : "已发送测试通知。");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setLanNotifyPermission(permission);
      if (permission === "granted") {
        new Notification(isEN ? "LAN notification enabled" : "局域网通知已开启", {
          body: isEN ? "You will now receive inbox alerts." : "后续收件箱新消息会弹出提醒。",
          tag: "lan-notify-enabled",
        });
        setLanResp(isEN ? "Notification enabled." : "通知已开启。");
      } else if (permission === "denied") {
        setLanResp(isEN ? "Notification denied in browser settings." : "通知已被浏览器阻止。");
      } else {
        setLanResp(isEN ? "Notification permission not granted." : "通知权限未授予。");
      }
    } catch {
      setLanResp(isEN ? "Failed to request notification permission." : "请求通知权限失败。");
    }
  }, [isEN]);

  const clearInbox = useCallback(async () => {
    setLanInboxBusy(true);
    try {
      await fetch("/api/lan/inbox", { method: "DELETE" });
      lanKnownIdsRef.current = new Set();
      lanAutoDownloadedIdsRef.current = new Set();
      lanProcessingRef.current = new Set();
      setLanAutoDownloadLogs({});
      setLanInbox([]);
    } finally {
      setLanInboxBusy(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setLanNotifyPermission(Notification.permission);
    } else {
      setLanNotifyPermission("unsupported");
    }
    fetchInbox();
    const source = new EventSource("/api/lan/stream");
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string; message?: LanMsg };
        if (payload?.type === "message" && payload.message?.id) {
          processLanIncomingMessage(payload.message);
        }
        if (payload?.type === "clear") {
          lanKnownIdsRef.current = new Set();
          lanAutoDownloadedIdsRef.current = new Set();
          setLanAutoDownloadLogs({});
          setLanInbox([]);
        }
      } catch {}
    };
    return () => {
      source.close();
    };
  }, [fetchInbox, processLanIncomingMessage]);

   return (
     <>
       <button
         onClick={() => setOpen(true)}
         className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
         aria-label={isEN ? "More Features" : "更多功能"}
         title={isEN ? "More Features" : "更多功能"}
       >
         <MoreHorizontal className="h-4 w-4" />
         <span className="ml-1">{isEN ? "More" : "更多功能"}</span>
       </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-black/50 p-4">
              <div className="relative w-full max-w-3xl max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-lg border bg-background p-4 shadow-lg [WebkitOverflowScrolling:touch]">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">{isEN ? "More Features" : "更多功能"}</h2>
                  <button
                    onClick={close}
                    className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
                    aria-label={isEN ? "Close" : "关闭"}
                    title={isEN ? "Close" : "关闭"}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {activeFeature === null ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {features.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          if (f.id === "siteSettings") {
                            close();
                            router.push(isEN ? "/en/settings/site" : "/settings/site");
                            return;
                          }
                          setActiveFeature(f.id);
                        }}
                        className="group flex min-h-20 items-center rounded-lg border bg-background p-3 text-sm transition-colors hover:bg-accent"
                        aria-label={f.title}
                        title={f.title}
                      >
                        <div className="flex items-center gap-3 flex-1 text-left">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background">
                            {f.icon}
                          </span>
                          <div className="flex-1">
                            <div className="font-medium">{f.title}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground truncate">{f.desc}</div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                      </button>
                    ))}
                  </div>
                ) : null}
                {activeFeature === "domain" ? (
                  <div className="mt-3 max-h-[78dvh] overflow-y-auto rounded-md border p-3 [WebkitOverflowScrolling:touch]">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          setActiveFeature(null);
                          setInput("");
                          setResult(null);
                          setCopied(false);
                        }}
                        className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
                        aria-label={isEN ? "Back" : "返回"}
                        title={isEN ? "Back" : "返回"}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <div className="text-sm font-medium">{isEN ? "Generate Domain" : "生成域名"}</div>
                      <div className="w-6" />
                    </div>
                    <div className="mt-2 text-xs">
                      <span className="text-muted-foreground">{isEN ? "Last:" : "上次生成："}</span>
                      <span className="ml-1 font-mono">{last ?? (isEN ? "—" : "—")}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {isEN
                        ? "Enter a subdomain; rotates through preset bases in order."
                        : "输入三级域名；按预设二级域名顺序循环输出。"}
                    </p>
                    <form onSubmit={handleGenerate} className="mt-3">
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isEN ? "Enter third-level name" : "请输入三级域名字符串"}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="submit"
                          className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                        >
                          {isEN ? "Generate" : "生成"}
                        </button>
                        {result ? (
                          <>
                            <span className="text-sm font-mono">{result}</span>
                            <button
                              type="button"
                              onClick={handleCopy}
                              className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
                            >
                              {copied ? (isEN ? "Copied" : "已复制") : (isEN ? "Copy" : "复制")}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </form>
                  </div>
                ) : null}
                {activeFeature === "base64" ? (
                  <div className="mt-3 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          setActiveFeature(null);
                          setB64Input("");
                          setB64Output(null);
                        }}
                        className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
                        aria-label={isEN ? "Back" : "返回"}
                        title={isEN ? "Back" : "返回"}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <div className="text-sm font-medium">{isEN ? "Base64" : "Base64解析"}</div>
                      <div className="w-6" />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {isEN ? "Encode/decode text with selected charset." : "选择字符集进行编码或解码。"}
                    </p>
                    <form onSubmit={handleB64Convert} className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={b64Mode}
                          onChange={(e) => setB64Mode(e.target.value as "encode" | "decode")}
                          className="rounded-md border bg-background px-2 py-1 text-xs"
                        >
                          <option value="encode">{isEN ? "Encode" : "编码"}</option>
                          <option value="decode">{isEN ? "Decode" : "解码"}</option>
                        </select>
                        <select
                          value={b64Charset}
                          onChange={(e) => setB64Charset(e.target.value)}
                          className="rounded-md border bg-background px-2 py-1 text-xs"
                        >
                          {charsets.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        value={b64Input}
                        onChange={(e) => setB64Input(e.target.value)}
                        placeholder={
                          b64Mode === "encode"
                            ? isEN
                              ? "Enter text"
                              : "请输入文本"
                            : isEN
                            ? "Enter Base64"
                            : "请输入 Base64 字符串"
                        }
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                        >
                          {isEN ? "Convert" : "转换"}
                        </button>
                        {b64Output ? (
                          <button
                            type="button"
                            onClick={handleB64Copy}
                            className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
                          >
                            {isEN ? "Copy" : "复制结果"}
                          </button>
                        ) : null}
                      </div>
                      {formattedB64Output ? (
                        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border bg-background p-2 text-sm leading-relaxed">
                          {formattedB64Output}
                        </pre>
                      ) : null}
                    </form>
                  </div>
                ) : null}
                {activeFeature === "repo" ? (
                  <div className="mt-3 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          setActiveFeature(null);
                          setRepoInput("");
                          setRepoOutput(null);
                          setRepoCopied(false);
                        }}
                        className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
                        aria-label={isEN ? "Back" : "返回"}
                        title={isEN ? "Back" : "返回"}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <div className="text-sm font-medium">{isEN ? "GitHub URL" : "GitHub地址补齐"}</div>
                      <div className="w-6" />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {isEN
                        ? "Input repo name and generate https://github.com/webappbox/{name}.git."
                        : "输入仓库名，自动生成 https://github.com/webappbox/{name}.git"}
                    </p>
                    <form onSubmit={handleRepoBuild} className="mt-3 space-y-2">
                      <input
                        value={repoInput}
                        onChange={(e) => setRepoInput(e.target.value)}
                        placeholder={isEN ? "Enter repo name, e.g. Somnus" : "输入仓库名，例如 Somnus"}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                        >
                          {isEN ? "Generate" : "生成"}
                        </button>
                        {repoOutput ? (
                          <button
                            type="button"
                            onClick={handleRepoCopy}
                            className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
                          >
                            {repoCopied ? (isEN ? "Copied" : "复制成功") : (isEN ? "Copy" : "复制")}
                          </button>
                        ) : null}
                      </div>
                      {repoOutput ? (
                        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border bg-background p-2 text-sm leading-relaxed">
                          {repoOutput}
                        </pre>
                      ) : null}
                    </form>
                  </div>
                ) : null}
                {activeFeature === "escape" ? (
                  <div className="mt-3 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          setActiveFeature(null);
                          setEscapeInput("");
                          setEscapeOutput(null);
                        }}
                        className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
                        aria-label={isEN ? "Back" : "返回"}
                        title={isEN ? "Back" : "返回"}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <div className="text-sm font-medium">{isEN ? "Escape Decode" : "转义还原"}</div>
                      <div className="w-6" />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {isEN
                        ? "Paste JSON or URL text to decode escaped content and make it readable."
                        : "粘贴 JSON 或链接文本，自动把转义内容还原成可读格式。"}
                    </p>
                    <form onSubmit={handleEscapeDecode} className="mt-3 space-y-2">
                      <textarea
                        value={escapeInput}
                        onChange={(e) => setEscapeInput(e.target.value)}
                        placeholder={
                          isEN
                            ? "Paste escaped JSON or URL text"
                            : "粘贴带转义的 JSON 或链接文本"
                        }
                        rows={8}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                        >
                          {isEN ? "Decode" : "还原"}
                        </button>
                        {escapeOutput ? (
                          <button
                            type="button"
                            onClick={handleEscapeCopy}
                            className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
                          >
                            {isEN ? "Copy" : "复制结果"}
                          </button>
                        ) : null}
                      </div>
                      {escapeOutput ? (
                        <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-md border bg-background p-2 text-sm leading-relaxed">
                          {escapeOutput}
                        </pre>
                      ) : null}
                    </form>
                  </div>
                ) : null}
                {activeFeature === "lan" ? (
                  <div className="mt-3 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          setActiveFeature(null);
                          setLanResp(null);
                          setLanConfigOpen(false);
                        }}
                        className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
                        aria-label={isEN ? "Back" : "返回"}
                        title={isEN ? "Back" : "返回"}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <div className="text-sm font-medium">{isEN ? "LAN Message" : "局域网消息"}</div>
                      <div className="w-6" />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {isEN ? "Send message to a LAN IP via HTTP." : "通过 HTTP 向同一局域网 IP 发送消息。"}
                    </p>
                    <form onSubmit={handleLanSend} className="mt-3 space-y-2">
                      <input
                        value={lanMsg}
                        onChange={(e) => setLanMsg(e.target.value)}
                        placeholder={isEN ? "Message" : "消息内容"}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <div className="rounded-md border p-2">
                        <button
                          type="button"
                          onClick={() => setLanConfigOpen((v) => !v)}
                          className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
                        >
                          {lanConfigOpen
                            ? (isEN ? "Hide Config" : "收起配置")
                            : (isEN ? "Edit Config" : "查看/编辑配置")}
                        </button>
                        {lanConfigOpen ? (
                          <div className="mt-2 space-y-2">
                            <input
                              value={lanHost}
                              onChange={(e) => setLanHost(e.target.value)}
                              placeholder={isEN ? "Host, e.g. 192.168.1.2" : "主机，如 192.168.1.2"}
                              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <input
                              value={lanPort}
                              onChange={(e) => setLanPort(e.target.value)}
                              placeholder={isEN ? "Port, e.g. 3000" : "端口，如 3000"}
                              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <input
                              value={lanFrom}
                              onChange={(e) => setLanFrom(e.target.value)}
                              placeholder={isEN ? "From, e.g. gotyourfiles" : "发送方标识，如 gotyourfiles"}
                              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <input
                              value={lanToken}
                              onChange={(e) => setLanToken(e.target.value)}
                              placeholder={isEN ? "Auth token" : "鉴权 token"}
                              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={lanSending}
                          className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                        >
                          {lanSending ? (isEN ? "Sending..." : "发送中...") : (isEN ? "Send" : "发送")}
                        </button>
                        {lanResp ? <span className="text-sm">{lanResp}</span> : null}
                      </div>
                    </form>
                    <div className="mt-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{isEN ? "Inbox" : "收件箱"}</div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleLanNotifyAction}
                            className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
                          >
                            {lanNotifyPermission === "granted" ? (isEN ? "Test Alert" : "测试提醒") : (isEN ? "Enable Alert" : "开启提醒")}
                          </button>
                          <button
                            type="button"
                            onClick={fetchInbox}
                            disabled={lanInboxBusy}
                            className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                          >
                            {isEN ? "Refresh" : "刷新"}
                          </button>
                          <button
                            type="button"
                            onClick={clearInbox}
                            disabled={lanInboxBusy}
                            className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                          >
                            {isEN ? "Clear" : "清空"}
                          </button>
                        </div>
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {lanNotifyPermission === "granted"
                          ? (isEN ? "Alert status: enabled" : "提醒状态：已开启")
                          : lanNotifyPermission === "denied"
                            ? (isEN ? "Alert status: blocked by browser" : "提醒状态：被浏览器阻止")
                            : lanNotifyPermission === "unsupported"
                              ? (isEN ? "Alert status: unsupported in browser" : "提醒状态：当前浏览器不支持")
                              : (isEN ? "Alert status: not granted" : "提醒状态：未授权")}
                      </div>
                      <div className="mt-2 h-56 overflow-y-auto rounded-md border">
                        {lanInbox.length === 0 ? (
                          <div className="p-3 text-xs text-muted-foreground">{isEN ? "Empty" : "暂无消息"}</div>
                        ) : (
                          <ul className="space-y-2 p-2">
                            {lanInbox
                              .slice()
                              .reverse()
                              .map((m) => (
                                <li key={m.id} className="rounded-md border bg-accent/30 p-2.5 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[11px] text-muted-foreground">{new Date(m.ts).toLocaleString()}</span>
                                    <span className="rounded-md border bg-background px-1.5 py-0.5 text-[10px] leading-none">{m.method}</span>
                                    <span className="ml-auto max-w-[40%] truncate rounded-md border bg-background px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                                      {m.from || (isEN ? "unknown" : "未知")}
                                    </span>
                                  </div>
                                  <div className="mt-2 break-all rounded-md bg-background px-2 py-1.5 text-sm leading-relaxed">{m.msg}</div>
                                  <div className="mt-1 break-all text-[11px] text-muted-foreground">
                                    {lanAutoDownloadLogs[m.id] ?? (isEN ? "Auto download: pending check" : "自动下载：待检测")}
                                  </div>
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
                {activeFeature === "imageCrawler" ? (
                  <div className="mt-3 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          setActiveFeature(null);
                          handleImageCrawlReset();
                        }}
                        className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
                        aria-label={isEN ? "Back" : "返回"}
                        title={isEN ? "Back" : "返回"}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <div className="text-sm font-medium">{isEN ? "Image Crawl ZIP" : "图片抓取打包"}</div>
                      <div className="w-6" />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {isEN
                        ? "Grab page images or pasted image URLs, filter by format and count, then package them into one ZIP."
                        : "支持抓取网页图片或直接粘贴图片链接，可按格式和数量筛选，完成后自动打包 ZIP。"}
                    </p>
                    {imageCrawlInProgressView ? (
                      <div className="mt-3 space-y-3">
                        <div className="rounded-md border bg-background p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium">
                                {imageCrawlResult
                                  ? (isEN ? "ZIP Ready" : "打包完成")
                                  : imageCrawlStatus === "error"
                                    ? (isEN ? "Crawl Failed" : "抓取失败")
                                    : (isEN ? "Crawl Progress" : "抓取进度")}
                              </div>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {imageCrawlMode === "page"
                                  ? (isEN ? "Source: page URL" : "来源：网页地址")
                                  : (isEN ? "Source: image URL list" : "来源：图片链接列表")}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleImageCrawlReset}
                              className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
                            >
                              {isEN ? "Back to Setup" : "返回设置"}
                            </button>
                          </div>

                          <div className="rounded-md border bg-accent/20 p-2 text-[11px] text-muted-foreground">
                            <div className="break-all">
                              {imageCrawlMode === "page"
                                ? (imageCrawlPageUrl || (isEN ? "No page URL" : "未填写网页地址"))
                                : (isEN ? `URL count: ${imageCrawlListText.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean).length}` : `链接数量：${imageCrawlListText.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean).length}`)}
                            </div>
                            <div className="mt-1">
                              {isEN ? "Limit" : "数量"}: {imageCrawlLimit}
                              {" · "}
                              {isEN ? "Formats" : "格式"}: {imageCrawlFormats.join(", ").toUpperCase()}
                            </div>
                          </div>

                          {imageCrawlStatus === "crawling" && imageCrawlProgress ? (
                            <div className="rounded-md border bg-accent/20 p-3">
                              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>{isEN ? "Progress" : "当前进度"}</span>
                                <span>
                                  {imageCrawlProgress.total > 0
                                    ? `${Math.min(imageCrawlProgress.current, imageCrawlProgress.total)} / ${imageCrawlProgress.total}`
                                    : (isEN ? "Preparing..." : "准备中...")}
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full bg-blue-600 transition-all"
                                  style={{ width: `${imageCrawlProgressPercent}%` }}
                                />
                              </div>
                              <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                                <div>{imageCrawlProgress.message || (isEN ? "Working..." : "处理中...")}</div>
                                <div>
                                  {isEN ? "Saved" : "已保存"}: {imageCrawlProgress.savedCount}
                                  {" · "}
                                  {isEN ? "Skipped" : "已跳过"}: {imageCrawlProgress.skippedCount}
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {imageCrawlStatus === "crawling" ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleAbortImageCrawl}
                                className="inline-flex items-center rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                              >
                                {isEN ? "Stop Crawl" : "结束抓取"}
                              </button>
                              <p className="text-[11px] text-muted-foreground">
                                {isEN ? "If the target site is slow, you can stop the crawl and clean up immediately." : "如果目标站点响应慢，可以点击“结束抓取”立即中止并清理现场。"}
                              </p>
                            </div>
                          ) : null}
                        </div>

                        {imageCrawlError ? (
                          <div className="rounded-md border border-red-200 bg-red-50 p-3">
                            <div className="text-xs font-medium text-red-700">
                              {isEN ? "Last error" : "失败原因"}
                            </div>
                            <p className="mt-1 text-xs text-red-600">{imageCrawlError}</p>
                          </div>
                        ) : null}

                        {imageCrawlResult && imageCrawlExpiryTime ? (
                          <div className="rounded-md border border-green-200 bg-green-50 p-3">
                            <div className="text-xs font-medium text-green-800 mb-2">
                              {isEN ? "Image ZIP is ready" : "图片 ZIP 已生成"}
                            </div>
                            <div className="space-y-1 text-xs text-green-700">
                              <div>{isEN ? "Saved images" : "已保存图片"}: {imageCrawlResult.imageCount}</div>
                              <div>{isEN ? "Checked links" : "已检查链接"}: {imageCrawlResult.checkedCount}</div>
                              <div>{isEN ? "Skipped" : "已跳过"}: {imageCrawlResult.skippedCount}</div>
                              <div>{isEN ? "ZIP size" : "ZIP 大小"}: {(imageCrawlResult.totalSize / 1024).toFixed(1)} KB</div>
                              <div className="text-blue-600 font-medium">
                                {isEN ? "Expires in: " : "剩余时间: "}
                                {Math.max(0, Math.floor((imageCrawlExpiryTime - currentTime) / 1000))}s
                              </div>
                              <div className="text-xs text-gray-500">
                                {isEN
                                  ? "The ZIP is cached temporarily and will be auto-cleaned if not downloaded."
                                  : "ZIP 仅做临时缓存，若未下载也会在过期后自动清理。"}
                              </div>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  void handleImageCrawlDownload();
                                }}
                                className="inline-flex items-center rounded-md border bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
                              >
                                {isEN ? "Download ZIP" : "下载 ZIP"}
                              </button>
                              <button
                                type="button"
                                onClick={handleImageCrawlReset}
                                className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                              >
                                {isEN ? "New Crawl" : "重新抓取"}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <form onSubmit={handleImageCrawlSubmit} className="mt-3 space-y-3">
                        <div className="rounded-md border bg-background p-3 space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setImageCrawlMode("page")}
                              className={`rounded-md border px-3 py-2 text-xs ${imageCrawlMode === "page" ? "border-blue-500 text-blue-600" : "hover:bg-accent"}`}
                            >
                              {isEN ? "Page URL" : "网页地址"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setImageCrawlMode("list")}
                              className={`rounded-md border px-3 py-2 text-xs ${imageCrawlMode === "list" ? "border-blue-500 text-blue-600" : "hover:bg-accent"}`}
                            >
                              {isEN ? "Image URL List" : "图片链接列表"}
                            </button>
                          </div>

                          {imageCrawlMode === "page" ? (
                            <div className="space-y-2">
                              <input
                                type="url"
                                value={imageCrawlPageUrl}
                                onChange={(e) => setImageCrawlPageUrl(e.target.value)}
                                placeholder={isEN ? "https://example.com/gallery" : "https://example.com/gallery"}
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              />
                              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                <input
                                  type="checkbox"
                                  checked={imageCrawlSameOriginOnly}
                                  onChange={(e) => setImageCrawlSameOriginOnly(e.target.checked)}
                                />
                                <span>{isEN ? "Only crawl same-origin images" : "仅抓取同域图片"}</span>
                              </label>
                              <p className="text-[11px] text-muted-foreground">
                                {isEN
                                  ? "Turn this off for search/result pages, otherwise many external images will be filtered out."
                                  : "搜索页/结果页通常要关闭这个选项，否则外链图片会被过滤掉。"}
                              </p>
                            </div>
                          ) : (
                            <textarea
                              value={imageCrawlListText}
                              onChange={(e) => setImageCrawlListText(e.target.value)}
                              placeholder={isEN ? "One image URL per line, or separate with commas" : "每行一个图片链接，也可用逗号分隔"}
                              className="h-28 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="mb-1 block text-xs text-muted-foreground">
                                {isEN ? "ZIP file name (optional)" : "ZIP 文件名（可选）"}
                              </label>
                              <input
                                type="text"
                                value={imageCrawlFilename}
                                onChange={(e) => setImageCrawlFilename(e.target.value)}
                                placeholder={isEN ? "image-pack" : "image-pack"}
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-muted-foreground">
                                {isEN ? "Max image count" : "最多抓取数量"}
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={imageCrawlLimit}
                                onChange={(e) => setImageCrawlLimit(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              />
                            </div>
                          </div>

                          <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={imageCrawlAutoDownload}
                              onChange={(e) => setImageCrawlAutoDownload(e.target.checked)}
                            />
                            <span>{isEN ? "Auto download ZIP after crawl completes" : "抓取完成后自动下载 ZIP"}</span>
                          </label>

                          <div>
                            <div className="mb-2 text-xs text-muted-foreground">
                              {isEN ? "Formats" : "固定格式"}
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {imageFormatOptions.map((option) => (
                                <label key={option.value} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={imageCrawlFormats.includes(option.value)}
                                    onChange={() => toggleImageCrawlFormat(option.value)}
                                  />
                                  <span>{option.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="mb-2 text-xs text-muted-foreground">
                              {isEN ? "Aspect ratios (optional)" : "图片比例（可选）"}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {imageAspectRatioOptions.map((option) => (
                                <label key={option.value} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={imageCrawlAspectRatios.includes(option.value)}
                                    onChange={() => toggleImageCrawlAspectRatio(option.value)}
                                  />
                                  <span>{option.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs text-muted-foreground">
                              {isEN ? "Exact sizes (optional)" : "指定尺寸（可选）"}
                            </label>
                            <textarea
                              value={imageCrawlExactSizesText}
                              onChange={(e) => setImageCrawlExactSizesText(e.target.value)}
                              placeholder={isEN ? "1024*1024, 1080x1920" : "1024*1024, 1080x1920"}
                              className="h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {isEN
                                ? "Use comma or line breaks. Images are filtered by actual width and height."
                                : "可用逗号或换行分隔，系统会按图片真实宽高筛选。"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="submit"
                              className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                            >
                              {isEN ? "Start Crawl" : "开始抓取"}
                            </button>
                            <button
                              type="button"
                              onClick={handleImageCrawlReset}
                              className="ml-auto inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
                            >
                              {isEN ? "Clear" : "清空"}
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                ) : null}
                {activeFeature === "imageConvert" ? (
                  <div className="mt-3 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          setActiveFeature(null);
                          handleImageConvertReset();
                        }}
                        className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
                        aria-label={isEN ? "Back" : "返回"}
                        title={isEN ? "Back" : "返回"}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <div className="text-sm font-medium">{isEN ? "Image Format Convert" : "图片格式转换"}</div>
                      <div className="w-6" />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {isEN
                        ? "Drag multiple images in, auto-detect source formats, convert them all to one selected format, then output one temporary ZIP."
                        : "支持拖入多张图片，自动识别原格式，统一转换为指定格式后输出一个临时 ZIP。"}
                    </p>
                    {imageConvertInProgressView ? (
                      <div className="mt-3 space-y-3">
                        <div className="rounded-md border bg-background p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium">
                                {imageConvertResult
                                  ? (isEN ? "ZIP Ready" : "打包完成")
                                  : imageConvertStatus === "error"
                                    ? (isEN ? "Convert Failed" : "转换失败")
                                    : imageConvertStatus === "uploading"
                                      ? (isEN ? "Uploading ZIP" : "正在上传 ZIP")
                                      : (isEN ? "Converting Images" : "正在转换图片")}
                              </div>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {isEN
                                  ? `Target format: ${imageConvertTargetFormat.toUpperCase()}`
                                  : `目标格式：${imageConvertTargetFormat.toUpperCase()}`}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleImageConvertReset}
                              className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
                            >
                              {isEN ? "Back to Setup" : "返回设置"}
                            </button>
                          </div>

                          <div className="rounded-md border bg-accent/20 p-2 text-[11px] text-muted-foreground">
                            <div>
                              {isEN ? "Images" : "图片数量"}: {imageConvertFiles.length}
                              {" · "}
                              {isEN ? "Detected formats" : "识别格式"}: {imageConvertDetectedFormats.join(", ") || "-"}
                            </div>
                            <div className="mt-1">
                              {isEN ? "ZIP name" : "ZIP 名称"}: {imageConvertZipFilename.trim() || (isEN ? "Auto-generated" : "自动生成")}
                            </div>
                          </div>

                          {!imageConvertResult && imageConvertProgress ? (
                            <div className="rounded-md border bg-accent/20 p-3">
                              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>{isEN ? "Progress" : "当前进度"}</span>
                                <span>{`${Math.min(imageConvertProgress.current, imageConvertProgress.total)} / ${imageConvertProgress.total}`}</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full bg-blue-600 transition-all"
                                  style={{ width: `${imageConvertProgressPercent}%` }}
                                />
                              </div>
                              <div className="mt-2 text-[11px] text-muted-foreground">
                                {imageConvertProgress.message}
                              </div>
                            </div>
                          ) : null}
                        </div>

                        {imageConvertError ? (
                          <div className="rounded-md border border-red-200 bg-red-50 p-3">
                            <div className="text-xs font-medium text-red-700">
                              {isEN ? "Last error" : "失败原因"}
                            </div>
                            <p className="mt-1 text-xs text-red-600">{imageConvertError}</p>
                          </div>
                        ) : null}

                        {imageConvertResult && imageConvertExpiryTime ? (
                          <div className="rounded-md border border-green-200 bg-green-50 p-3">
                            <div className="mb-2 text-xs font-medium text-green-800">
                              {isEN ? "Converted ZIP is ready" : "转换 ZIP 已生成"}
                            </div>
                            <div className="space-y-1 text-xs text-green-700">
                              <div>{isEN ? "Converted files" : "已转换文件"}: {imageConvertResult.convertedCount}</div>
                              <div>{isEN ? "Source formats" : "原始格式"}: {imageConvertResult.sourceFormats.join(", ") || "-"}</div>
                              <div>{isEN ? "Target format" : "目标格式"}: {imageConvertResult.targetFormat.toUpperCase()}</div>
                              <div>{isEN ? "ZIP size" : "ZIP 大小"}: {(imageConvertResult.totalSize / 1024).toFixed(1)} KB</div>
                              <div className="font-medium text-blue-600">
                                {isEN ? "Expires in: " : "剩余时间: "}
                                {Math.max(0, Math.floor((imageConvertExpiryTime - currentTime) / 1000))}s
                              </div>
                              <div className="text-xs text-gray-500">
                                {isEN
                                  ? "The ZIP is cached temporarily and will be auto-cleaned after expiration."
                                  : "ZIP 只会临时缓存，到期后会自动清理。"}
                              </div>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  void handleImageConvertDownload();
                                }}
                                className="inline-flex items-center rounded-md border bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
                              >
                                {isEN ? "Download ZIP" : "下载 ZIP"}
                              </button>
                              <button
                                type="button"
                                onClick={handleImageConvertReset}
                                className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                              >
                                {isEN ? "New Convert" : "重新转换"}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <form onSubmit={handleImageConvertSubmit} className="mt-3 space-y-3">
                        <div className="rounded-md border bg-background p-3 space-y-3">
                          <div
                            onDrop={handleImageConvertDrop}
                            onDragOver={handleImageConvertDragOver}
                            className="flex min-h-[120px] w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed bg-background p-4 text-center transition-colors hover:bg-accent/50"
                            onClick={() => document.getElementById("image-convert-file-input")?.click()}
                          >
                            <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              {isEN ? "Drag images here or click to select" : "拖拽图片到此处或点击选择"}
                            </p>
                            <input
                              id="image-convert-file-input"
                              type="file"
                              multiple
                              accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp,.svg,.avif"
                              onChange={handleImageConvertFileSelect}
                              className="hidden"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="mb-1 block text-xs text-muted-foreground">
                                {isEN ? "Target format" : "目标格式"}
                              </label>
                              <select
                                value={imageConvertTargetFormat}
                                onChange={(e) => setImageConvertTargetFormat(e.target.value as ImageConvertTargetFormat)}
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                {imageConvertTargetOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-muted-foreground">
                                {isEN ? "ZIP file name (optional)" : "ZIP 文件名（可选）"}
                              </label>
                              <input
                                type="text"
                                value={imageConvertZipFilename}
                                onChange={(e) => setImageConvertZipFilename(e.target.value)}
                                placeholder={isEN ? "converted-images" : "converted-images"}
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                              <span>{isEN ? "Quality" : "质量"}</span>
                              <span>{Math.round(imageConvertQuality * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min={60}
                              max={100}
                              step={1}
                              value={Math.round(imageConvertQuality * 100)}
                              onChange={(e) => setImageConvertQuality(Number(e.target.value) / 100)}
                              className="w-full"
                            />
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {imageConvertTargetFormat === "png"
                                ? (isEN ? "PNG ignores quality and preserves lossless output." : "PNG 会忽略质量设置，保持无损导出。")
                                : (isEN ? "Higher quality usually means larger file size." : "质量越高通常文件越大。")}
                            </p>
                          </div>

                          {imageConvertFiles.length > 0 ? (
                            <div className="rounded-md border bg-background p-3">
                              <div className="mb-2 text-xs font-medium">
                                {isEN ? "Selected images" : "已选图片"} ({imageConvertFiles.length})
                              </div>
                              <div className="max-h-40 space-y-1 overflow-y-auto">
                                {imageConvertFiles.map((file, index) => (
                                  <div key={`${file.name}-${index}`} className="flex items-center justify-between text-xs">
                                    <span className="truncate pr-2" title={file.name}>{file.name}</span>
                                    <span className="shrink-0 text-muted-foreground">
                                      {detectImageFileFormat(file)} · {(file.size / 1024).toFixed(1)} KB
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          <div className="rounded-md border bg-accent/20 p-2 text-[11px] text-muted-foreground">
                            {isEN
                              ? "Supports batch conversion. The final ZIP uses temporary cache and will be auto-cleaned after expiration."
                              : "支持批量转换，最终 ZIP 只做临时缓存，过期后会自动清理。"}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {isEN
                              ? "Note: GIF/SVG are rasterized during export. Animated GIF keeps only a single rendered frame."
                              : "说明：GIF/SVG 转换时会栅格化导出；动画 GIF 仅保留单帧渲染结果。"}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="submit"
                              className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                            >
                              {isEN ? "Start Convert" : "开始转换"}
                            </button>
                            <button
                              type="button"
                              onClick={handleImageConvertReset}
                              className="ml-auto inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
                            >
                              {isEN ? "Clear" : "清空"}
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                ) : null}
                {activeFeature === "compress" ? (
                  <div className="mt-3 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          setActiveFeature(null);
                          handleCompressReset();
                        }}
                        className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
                        aria-label={isEN ? "Back" : "返回"}
                        title={isEN ? "Back" : "返回"}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <div className="text-sm font-medium">{isEN ? "Dynamic Popup File Compress" : "动态弹窗文件压缩"}</div>
                      <div className="w-6" />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {isEN
                        ? "Complete steps in order: name zip, add files, configure flowConfig, then compress."
                        : "按步骤完成：先填压缩包名，再加文件，再配置 flowConfig，最后压缩。"}
                    </p>
                    <div className="mt-2 flex items-center gap-1 overflow-x-auto text-[11px] [WebkitOverflowScrolling:touch]">
                      {[
                        isEN ? "1.Name" : "1.名称",
                        isEN ? "2.Files" : "2.文件",
                        isEN ? "3.flowConfig" : "3.flowConfig",
                        isEN ? "4.Compress" : "4.压缩",
                      ].map((label, idx) => {
                        const step = (idx + 1) as 1 | 2 | 3 | 4;
                        const active = compressWizardStep === step;
                        const done = compressWizardStep > step;
                        return (
                          <div
                            key={label}
                            className={`min-w-[78px] shrink-0 rounded-md border px-2 py-1 text-center ${active ? "border-blue-500 text-blue-600" : done ? "border-green-500 text-green-600" : "text-muted-foreground"}`}
                          >
                            {label}
                          </div>
                        );
                      })}
                    </div>
                    <form onSubmit={handleCompressSubmit} className="mt-3 space-y-3">
                      {compressWizardStep === 1 && (
                        <div className="rounded-md border bg-background p-3">
                          <label className="mb-2 block text-xs font-medium">
                            {isEN ? "ZIP file name (optional)" : "压缩包名称（可选）"}
                          </label>
                          <input
                            type="text"
                            value={zipFilename}
                            onChange={(e) => setZipFilename(e.target.value)}
                            placeholder={isEN ? "Enter custom file name" : "输入自定义文件名"}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            {isEN ? "Leave empty for automatic naming" : "留空使用自动生成的文件名"}
                          </p>
                          <div className="mt-3 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setCompressWizardStep(2)}
                              className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                            >
                              {isEN ? "Next: Add Files" : "下一步：添加文件"}
                            </button>
                          </div>
                        </div>
                      )}

                      {compressWizardStep === 2 && (
                        <div className="space-y-3 rounded-md border bg-background p-3">
                          <div
                            onDrop={handleCompressDrop}
                            onDragOver={handleCompressDragOver}
                            className="flex min-h-[120px] w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed bg-background p-4 text-center transition-colors hover:bg-accent/50"
                            onClick={() => document.getElementById('compress-file-input')?.click()}
                          >
                            <FileArchive className="mb-2 h-8 w-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              {isEN ? "Drag files here or click to select" : "拖拽文件到此处或点击选择"}
                            </p>
                            <input
                              id="compress-file-input"
                              type="file"
                              multiple
                              onChange={handleCompressFileSelect}
                              className="hidden"
                              accept=".json,application/json"
                            />
                          </div>
                          {compressFiles.length > 0 && (
                            <div className="rounded-md border bg-background p-3">
                              <div className="mb-2 text-xs font-medium">
                                {isEN ? "Selected files" : "已选文件"} ({compressFiles.length})
                              </div>
                              <div className="max-h-40 overflow-y-auto space-y-1">
                                {compressFiles.map((file, index) => (
                                  <div key={index} className="flex items-center justify-between text-xs">
                                    <span className="truncate" title={file.name}>{file.name}</span>
                                    <span className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setCompressWizardStep(1)} className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs hover:bg-accent">
                              {isEN ? "Back" : "上一步"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (compressFiles.length === 0) {
                                  setCompressError(isEN ? "Please select files first" : "请先选择文件");
                                  return;
                                }
                                setCompressError(null);
                                setCompressWizardStep(3);
                              }}
                              className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                            >
                              {isEN ? "Next: flowConfig" : "下一步：flowConfig"}
                            </button>
                          </div>
                        </div>
                      )}

                      {compressWizardStep === 3 && (
                        <div className="rounded-md border bg-background p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-medium">
                              {isEN ? "flowConfig" : "flowConfig 配置"}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFlowConfigEditorOpen((prev) => {
                                  const next = !prev;
                                  if (next) setFlowConfigWizardStep(1);
                                  return next;
                                });
                              }}
                              className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
                            >
                              {flowConfigEditorOpen
                                ? (isEN ? "Close Config" : "关闭配置")
                                : (isEN ? "Configure flowConfig" : "配置 flowConfig")}
                            </button>
                          </div>
                          <div className={`text-xs ${flowConfigConfigured ? "text-green-600" : "text-amber-600"}`}>
                            {flowConfigConfigured
                              ? (isEN ? "Configured and validated" : "已配置并通过校验")
                              : (isEN ? "Not configured yet" : "尚未配置")}
                          </div>
                          {flowConfigEditorOpen && (
                            <div className="flex items-center gap-1 overflow-x-auto text-[11px] [WebkitOverflowScrolling:touch]">
                              {[
                                isEN ? "1.Basic" : "1.基础",
                                isEN ? "2.Anim" : "2.动画",
                                isEN ? "3.Action" : "3.动作",
                                isEN ? "4.JSON" : "4.JSON",
                              ].map((label, idx) => {
                                const step = (idx + 1) as 1 | 2 | 3 | 4;
                                const active = flowConfigWizardStep === step;
                                const done = flowConfigWizardStep > step;
                                return (
                                  <button
                                    key={label}
                                    type="button"
                                    onClick={() => setFlowConfigWizardStep(step)}
                                    className={`min-w-[78px] shrink-0 rounded-md border px-2 py-1 text-center ${active ? "border-blue-500 text-blue-600" : done ? "border-green-500 text-green-600" : "text-muted-foreground"}`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {flowConfigEditorOpen && (
                            <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1 [WebkitOverflowScrolling:touch]">
                              <div className="space-y-3">
                            {flowConfigWizardStep === 1 && (
                              <>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="mb-1 block text-[11px] text-muted-foreground">
                                  {isEN ? "Template" : "流程模板"}
                                </label>
                                <select
                                  value={flowConfigForm.templateId}
                                  onChange={(e) => applyTemplateDefaults(e.target.value as FlowTemplateId)}
                                  className="w-full rounded-md border bg-background px-2 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <option value="scenario1">{isEN ? "Scenario1: display only" : "场景1：仅展示不可点"}</option>
                                  <option value="scenario2">{isEN ? "Scenario2: interactive only" : "场景2：仅可点循环"}</option>
                                  <option value="scenario3">{isEN ? "Scenario3: nonTap → tap" : "场景3：不可点 → 可点"}</option>
                                  <option value="scenario4">{isEN ? "Scenario4: 2-seg click→B" : "场景4：两段点击进B段"}</option>
                                  <option value="scenario5">{isEN ? "Scenario5: 2-seg full" : "场景5：两段完整流程"}</option>
                                  <option value="scenario6_front_rear">{isEN ? "Scenario6: front/rear anim" : "场景6：前置+后置过渡动画"}</option>
                                  <option value="scenario7_runtime_link">{isEN ? "Scenario7: runtime link" : "场景7：运行时动态获取link"}</option>
                                  <option value="custom">{isEN ? "Custom" : "自定义"}</option>
                                </select>
                              </div>
                              <div className="flex items-end gap-2">
                                <label className="flex items-center gap-1 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={flowConfigManualMode}
                                    onChange={(e) => {
                                      setFlowConfigManualMode(e.target.checked);
                                      markFlowConfigDirty();
                                      if (e.target.checked) {
                                        setFlowConfigManualText(autoFlowConfigText);
                                      }
                                    }}
                                  />
                                  <span>{isEN ? "Advanced JSON edit" : "高级 JSON 编辑"}</span>
                                </label>
                              </div>
                            </div>

                            <div className="rounded-md border p-2 space-y-2">
                              <label className="flex items-center gap-1 text-xs">
                                <input
                                  type="checkbox"
                                  checked={flowConfigForm.enableCloseButton}
                                  onChange={(e) => updateFlowConfigForm({ enableCloseButton: e.target.checked })}
                                />
                                <span>{isEN ? "Enable close button" : "启用关闭按钮"}</span>
                              </label>
                              {flowConfigForm.enableCloseButton && (
                                <div className="grid grid-cols-4 gap-1">
                                  <input type="number" value={flowConfigForm.closeButtonFrame.x} onChange={(e) => updateFlowConfigForm({ closeButtonFrame: { ...flowConfigForm.closeButtonFrame, x: Number(e.target.value) } })} placeholder="x" className="rounded-md border px-2 py-1 text-xs" />
                                  <input type="number" value={flowConfigForm.closeButtonFrame.y} onChange={(e) => updateFlowConfigForm({ closeButtonFrame: { ...flowConfigForm.closeButtonFrame, y: Number(e.target.value) } })} placeholder="y" className="rounded-md border px-2 py-1 text-xs" />
                                  <input type="number" value={flowConfigForm.closeButtonFrame.w} onChange={(e) => updateFlowConfigForm({ closeButtonFrame: { ...flowConfigForm.closeButtonFrame, w: Number(e.target.value) } })} placeholder="w" className="rounded-md border px-2 py-1 text-xs" />
                                  <input type="number" value={flowConfigForm.closeButtonFrame.h} onChange={(e) => updateFlowConfigForm({ closeButtonFrame: { ...flowConfigForm.closeButtonFrame, h: Number(e.target.value) } })} placeholder="h" className="rounded-md border px-2 py-1 text-xs" />
                                </div>
                              )}
                              <select
                                value={flowConfigForm.closeVisiblePolicy}
                                onChange={(e) => updateFlowConfigForm({ closeVisiblePolicy: e.target.value as CloseVisiblePolicy })}
                                className="w-full rounded-md border bg-background px-2 py-1 text-xs"
                              >
                                <option value="always_hidden">{isEN ? "Hide always" : "始终隐藏"}</option>
                                <option value="wait_only">{isEN ? "Show on wait_event only" : "仅 wait_event 显示"}</option>
                                <option value="always_show">{isEN ? "Show always" : "始终显示"}</option>
                                <option value="custom">{isEN ? "Custom per node" : "每节点自定义"}</option>
                              </select>
                              {flowConfigForm.closeVisiblePolicy === "custom" && (
                                <div className="grid grid-cols-2 gap-1">
                                  {closeVisibleNodeIds.map((nodeId) => (
                                    <label key={nodeId} className="flex items-center gap-1 text-xs">
                                      <input
                                        type="checkbox"
                                        checked={!!flowConfigForm.customCloseVisible[nodeId]}
                                        onChange={(e) => {
                                          updateFlowConfigForm({
                                            customCloseVisible: {
                                              ...flowConfigForm.customCloseVisible,
                                              [nodeId]: e.target.checked,
                                            },
                                          });
                                        }}
                                      />
                                      <span className="truncate">{nodeId}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                              </>
                            )}

                            {flowConfigWizardStep === 2 && (
                            <div className="rounded-md border p-2 space-y-2">
                              <div className="text-[11px] text-muted-foreground">{isEN ? "Animation mapping" : "动画映射选择"}</div>
                              {(flowConfigForm.templateId === "scenario6_front_rear") && (
                                <>
                                  <select value={flowConfigForm.frontAnimation} onChange={(e) => updateFlowConfigForm({ frontAnimation: e.target.value })} className="w-full rounded-md border px-2 py-1 text-xs">
                                    <option value="">{isEN ? "Select frontAnimation (optional)" : "选择前置动画 frontAnimation（可空）"}</option>
                                    {uploadedJsonFileNames.map((name) => <option key={`front-${name}`} value={name}>{name}</option>)}
                                  </select>
                                  <select value={flowConfigForm.rearAnimation} onChange={(e) => updateFlowConfigForm({ rearAnimation: e.target.value })} className="w-full rounded-md border px-2 py-1 text-xs">
                                    <option value="">{isEN ? "Select rearAnimation (optional)" : "选择后置动画 rearAnimation（可空）"}</option>
                                    {uploadedJsonFileNames.map((name) => <option key={`rear-${name}`} value={name}>{name}</option>)}
                                  </select>
                                </>
                              )}
                              {(flowConfigForm.templateId === "scenario1" || flowConfigForm.templateId === "scenario3" || flowConfigForm.templateId === "scenario6_front_rear" || flowConfigForm.templateId === "scenario7_runtime_link" || flowConfigForm.templateId === "custom") && (
                                <select value={flowConfigForm.nonTap} onChange={(e) => updateFlowConfigForm({ nonTap: e.target.value })} className="w-full rounded-md border px-2 py-1 text-xs">
                                  <option value="">{isEN ? "Select nonTap (optional)" : "选择 nonTap（可空）"}</option>
                                  {uploadedJsonFileNames.map((name) => <option key={`nonTap-${name}`} value={name}>{name}</option>)}
                                </select>
                              )}
                              {(flowConfigForm.templateId !== "scenario1") && (
                                <select value={flowConfigForm.tapLoop} onChange={(e) => updateFlowConfigForm({ tapLoop: e.target.value })} className="w-full rounded-md border px-2 py-1 text-xs">
                                  <option value="">{isEN ? "Select tapLoop" : "选择 tapLoop"}</option>
                                  {uploadedJsonFileNames.map((name) => <option key={`tapLoop-${name}`} value={name}>{name}</option>)}
                                </select>
                              )}
                              {(flowConfigForm.templateId === "scenario4" || flowConfigForm.templateId === "scenario5") && (
                                <>
                                  <select value={flowConfigForm.nonTap1} onChange={(e) => updateFlowConfigForm({ nonTap1: e.target.value })} className="w-full rounded-md border px-2 py-1 text-xs">
                                    <option value="">{isEN ? "Select nonTap1 (optional)" : "选择 nonTap1（可空）"}</option>
                                    {uploadedJsonFileNames.map((name) => <option key={`nonTap1-${name}`} value={name}>{name}</option>)}
                                  </select>
                                  <select value={flowConfigForm.tapLoop1} onChange={(e) => updateFlowConfigForm({ tapLoop1: e.target.value })} className="w-full rounded-md border px-2 py-1 text-xs">
                                    <option value="">{isEN ? "Select tapLoop1" : "选择 tapLoop1"}</option>
                                    {uploadedJsonFileNames.map((name) => <option key={`tapLoop1-${name}`} value={name}>{name}</option>)}
                                  </select>
                                  <select value={flowConfigForm.nonTap2} onChange={(e) => updateFlowConfigForm({ nonTap2: e.target.value })} className="w-full rounded-md border px-2 py-1 text-xs">
                                    <option value="">{isEN ? "Select nonTap2 (optional)" : "选择 nonTap2（可空）"}</option>
                                    {uploadedJsonFileNames.map((name) => <option key={`nonTap2-${name}`} value={name}>{name}</option>)}
                                  </select>
                                  <select value={flowConfigForm.tapLoop2} onChange={(e) => updateFlowConfigForm({ tapLoop2: e.target.value })} className="w-full rounded-md border px-2 py-1 text-xs">
                                    <option value="">{isEN ? "Select tapLoop2" : "选择 tapLoop2"}</option>
                                    {uploadedJsonFileNames.map((name) => <option key={`tapLoop2-${name}`} value={name}>{name}</option>)}
                                  </select>
                                </>
                              )}
                              <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                                <div>
                                  <label className="mb-1 block text-[10px] text-muted-foreground">{isEN ? "Design Width" : "设计宽度"}</label>
                                  <input type="number" value={flowConfigForm.designWidth} onChange={(e) => updateFlowConfigForm({ designWidth: Number(e.target.value) })} className="w-full rounded-md border px-2 py-1 text-xs" />
                                </div>
                                <div>
                                  <label className="mb-1 block text-[10px] text-muted-foreground">{isEN ? "Design Height" : "设计高度"}</label>
                                  <input type="number" value={flowConfigForm.designHeight} onChange={(e) => updateFlowConfigForm({ designHeight: Number(e.target.value) })} className="w-full rounded-md border px-2 py-1 text-xs" />
                                </div>
                              </div>
                              <select value={flowConfigForm.missingAnimationFallback} onChange={(e) => updateFlowConfigForm({ missingAnimationFallback: e.target.value as MissingAnimationFallback })} className="w-full rounded-md border px-2 py-1 text-xs">
                                <option value="next_segment">{isEN ? "Missing anim → next segment" : "动画缺失 → 下一段"}</option>
                                <option value="dismiss">{isEN ? "Missing anim → dismiss" : "动画缺失 → 关闭"}</option>
                              </select>
                            </div>
                            )}

                            {flowConfigWizardStep === 3 && (
                            <div className="rounded-md border p-2 space-y-2">
                              <div className="grid grid-cols-3 gap-2">
                                <select value={flowConfigForm.actionType} onChange={(e) => updateFlowConfigForm({ actionType: e.target.value as ActionType })} className="rounded-md border px-2 py-1 text-xs">
                                  <option value="primary">{isEN ? "action: primary" : "动作: primary"}</option>
                                  <option value="linkIndex">{isEN ? "action: linkIndex" : "动作: linkIndex"}</option>
                                </select>
                                <input type="number" value={flowConfigForm.actionLinkIndex} onChange={(e) => updateFlowConfigForm({ actionLinkIndex: Number(e.target.value) })} placeholder="action.linkIndex" className="rounded-md border px-2 py-1 text-xs" />
                                <select value={flowConfigForm.afterPrimaryAction} onChange={(e) => updateFlowConfigForm({ afterPrimaryAction: e.target.value as AfterPrimaryAction })} className="rounded-md border px-2 py-1 text-xs">
                                  <option value="dismiss">{isEN ? "after: dismiss" : "后续: dismiss"}</option>
                                  <option value="hold">{isEN ? "after: hold(ui)" : "后续: hold(ui)"}</option>
                                </select>
                              </div>
                              {(flowConfigForm.templateId === "scenario7_runtime_link") && (
                                <div className="grid grid-cols-2 gap-2">
                                  <select value={flowConfigForm.actionSource} onChange={(e) => updateFlowConfigForm({ actionSource: e.target.value as ActionSource })} className="rounded-md border px-2 py-1 text-xs">
                                    <option value="promo_response">{isEN ? "source: promo_response" : "source: promo_response"}</option>
                                    <option value="custom_runtime">{isEN ? "source: custom runtime" : "source: 自定义 runtime"}</option>
                                  </select>
                                  {flowConfigForm.actionSource === "custom_runtime" && (
                                    <input type="text" value={flowConfigForm.customRuntimeSource} onChange={(e) => updateFlowConfigForm({ customRuntimeSource: e.target.value })} placeholder={isEN ? "Custom source name" : "自定义 source 名"} className="rounded-md border px-2 py-1 text-xs" />
                                  )}
                                </div>
                              )}
                              {flowConfigForm.templateId === "scenario5" && (
                              <div className="grid grid-cols-2 gap-2">
                                <select value={flowConfigForm.firstClickBehavior} onChange={(e) => updateFlowConfigForm({ firstClickBehavior: e.target.value as FirstClickBehavior })} className="rounded-md border px-2 py-1 text-xs">
                                  <option value="route_primary">{isEN ? "route_primary" : "跳转 primary"}</option>
                                  <option value="route_linkIndex">{isEN ? "route_linkIndex" : "跳转 linkIndex"}</option>
                                  <option value="goto_next_segment">{isEN ? "goto_next_segment" : "进入下一段"}</option>
                                  <option value="dismiss">{isEN ? "dismiss" : "关闭"}</option>
                                </select>
                                <input type="number" value={flowConfigForm.firstClickLinkIndex} onChange={(e) => updateFlowConfigForm({ firstClickLinkIndex: Number(e.target.value) })} placeholder="linkIndex" className="rounded-md border px-2 py-1 text-xs" />
                              </div>
                              )}
                              <label className="flex items-center gap-1 text-xs">
                                <input type="checkbox" checked={flowConfigForm.useHitAreas} onChange={(e) => updateFlowConfigForm({ useHitAreas: e.target.checked })} />
                                <span>{isEN ? "Use hitAreas" : "使用热区按钮"}</span>
                              </label>
                              {flowConfigForm.useHitAreas && (
                                <div className="space-y-2">
                                  {flowConfigForm.hitAreas.map((area) => (
                                    <div key={area.id} className="grid grid-cols-6 gap-1">
                                      <input value={area.eventName} onChange={(e) => updateHitAreaItem(area.id, { eventName: e.target.value })} placeholder="event" className="rounded-md border px-2 py-1 text-xs col-span-2" />
                                      <input type="number" value={area.frame.x} onChange={(e) => updateHitAreaItem(area.id, { frame: { ...area.frame, x: Number(e.target.value) } })} placeholder="x" className="rounded-md border px-2 py-1 text-xs" />
                                      <input type="number" value={area.frame.y} onChange={(e) => updateHitAreaItem(area.id, { frame: { ...area.frame, y: Number(e.target.value) } })} placeholder="y" className="rounded-md border px-2 py-1 text-xs" />
                                      <input type="number" value={area.frame.w} onChange={(e) => updateHitAreaItem(area.id, { frame: { ...area.frame, w: Number(e.target.value) } })} placeholder="w" className="rounded-md border px-2 py-1 text-xs" />
                                      <input type="number" value={area.frame.h} onChange={(e) => updateHitAreaItem(area.id, { frame: { ...area.frame, h: Number(e.target.value) } })} placeholder="h" className="rounded-md border px-2 py-1 text-xs" />
                                      <select value={area.targetType} onChange={(e) => updateHitAreaItem(area.id, { targetType: e.target.value as HitAreaTargetType })} className="rounded-md border px-2 py-1 text-xs col-span-3">
                                        <option value="route_primary">route_primary</option>
                                        <option value="route_linkIndex">route_linkIndex</option>
                                        <option value="goto_next_segment">goto_next_segment</option>
                                        <option value="dismiss">dismiss</option>
                                      </select>
                                      <input type="number" value={area.targetLinkIndex} onChange={(e) => updateHitAreaItem(area.id, { targetLinkIndex: Number(e.target.value) })} placeholder="linkIndex" className="rounded-md border px-2 py-1 text-xs col-span-2" />
                                      <button type="button" onClick={() => removeHitAreaItem(area.id)} className="rounded-md border px-2 py-1 text-xs col-span-1">{isEN ? "Del" : "删"}</button>
                                    </div>
                                  ))}
                                  <button type="button" onClick={addHitAreaItem} className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent">
                                    {isEN ? "Add hit area" : "新增热区"}
                                  </button>
                                </div>
                              )}
                            </div>
                            )}

                            {flowConfigWizardStep === 4 && (
                              <>
                            <div className="rounded-md border p-2 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="text-[11px] text-muted-foreground">{isEN ? "JSON preview / advanced" : "JSON 预览 / 高级编辑"}</div>
                                <button
                                  type="button"
                                  onClick={() => copyText(flowConfigPreviewText)}
                                  className="inline-flex items-center rounded-md border px-2 py-1 text-[11px] hover:bg-accent"
                                >
                                  {isEN ? "Copy JSON" : "复制 JSON"}
                                </button>
                              </div>
                              <textarea
                                value={flowConfigPreviewText}
                                readOnly={!flowConfigManualMode}
                                onChange={(e) => {
                                  if (!flowConfigManualMode) return;
                                  setFlowConfigManualText(e.target.value);
                                  markFlowConfigDirty();
                                  try {
                                    JSON.parse(e.target.value);
                                    setFlowConfigManualError(null);
                                  } catch {
                                    setFlowConfigManualError(isEN ? "JSON parse error" : "JSON 解析错误");
                                  }
                                }}
                                className="h-40 w-full rounded-md border bg-background px-2 py-2 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              />
                              {flowConfigManualError && <p className="text-xs text-red-600">{flowConfigManualError}</p>}
                              {flowConfigErrors.length > 0 && (
                                <div className="rounded-md border border-red-200 bg-red-50 p-2">
                                  {flowConfigErrors.map((error, index) => (
                                    <p key={`${error}-${index}`} className="text-xs text-red-600">{error}</p>
                                  ))}
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={handleSaveFlowConfig}
                              className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
                            >
                              {isEN ? "Validate & Save flowConfig" : "校验并保存 flowConfig"}
                            </button>
                              </>
                            )}
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                disabled={flowConfigWizardStep === 1}
                                onClick={() => setFlowConfigWizardStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : prev))}
                                className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                              >
                                {isEN ? "Prev" : "上一步"}
                              </button>
                              <button
                                type="button"
                                disabled={flowConfigWizardStep === 4}
                                onClick={() => setFlowConfigWizardStep((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : prev))}
                                className="inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                              >
                                {isEN ? "Next" : "下一步"}
                              </button>
                            </div>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setCompressWizardStep(2)} className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs hover:bg-accent">
                              {isEN ? "Back" : "上一步"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!flowConfigConfigured) {
                                  setCompressError(isEN ? "Please configure flowConfig first" : "请先配置 flowConfig");
                                  return;
                                }
                                setCompressError(null);
                                setCompressWizardStep(4);
                              }}
                              className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                            >
                              {isEN ? "Next: Compress" : "下一步：压缩"}
                            </button>
                          </div>
                      </div>
                      )}

                      {compressWizardStep === 4 && (
                        <div className="space-y-3 rounded-md border bg-background p-3">
                          <div className="rounded-md border bg-accent/30 p-2 text-xs">
                            <div>{isEN ? "ZIP name" : "压缩包名"}: {zipFilename.trim() || (isEN ? "Auto" : "自动生成")}</div>
                            <div>{isEN ? "Files" : "文件"}: {compressFiles.length}</div>
                            <div>{isEN ? "flowConfig" : "flowConfig"}: {flowConfigConfigured ? (isEN ? "Configured" : "已配置") : (isEN ? "Not configured" : "未配置")}</div>
                          </div>
                          {compressFiles.length > 0 && (
                            <div className="rounded-md border bg-background p-3">
                              <div className="mb-2 text-xs font-medium">
                                {isEN ? "Selected files" : "已选文件"} ({compressFiles.length})
                              </div>
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {compressFiles.map((file, index) => (
                                  <div key={index} className="flex items-center justify-between text-xs">
                                    <span className="truncate" title={file.name}>
                                      {file.name}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {(file.size / 1024).toFixed(1)} KB
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setCompressWizardStep(3)} className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs hover:bg-accent">
                              {isEN ? "Back" : "上一步"}
                            </button>
                            <button
                              type="submit"
                              disabled={compressFiles.length === 0 || compressStatus === 'uploading' || !flowConfigConfigured}
                              className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                            >
                              {compressStatus === 'uploading'
                                ? (isEN ? 'Compressing...' : '压缩中...')
                                : (isEN ? 'Compress Files' : '压缩文件')
                              }
                            </button>

                            {compressStatus === 'ready' && (
                              <button
                                type="button"
                                onClick={handleCompressDownload}
                                className="inline-flex items-center rounded-md border bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
                              >
                                {isEN ? 'Download ZIP' : '下载ZIP文件'}
                              </button>
                            )}

                            {compressFiles.length > 0 && (
                              <button
                                type="button"
                                onClick={handleCompressReset}
                                className="ml-auto inline-flex items-center rounded-md border px-2 py-1 text-xs hover:bg-accent"
                              >
                                {isEN ? 'Clear' : '清空'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {compressError && (
                        <div className="rounded-md border border-red-200 bg-red-50 p-2">
                          <p className="text-xs text-red-600">{compressError}</p>
                        </div>
                      )}

                      {compressStatus === 'ready' && compressResult && compressExpiryTime && (
                        <div className="rounded-md border border-green-200 bg-green-50 p-3">
                          <div className="text-xs font-medium text-green-800 mb-2">
                            {isEN ? "Compression successful!" : "压缩成功！"}
                          </div>
                          <div className="text-xs text-green-700 space-y-1">
                            <div>{isEN ? "Files" : "文件数"}: {compressResult.fileCount}</div>
                            <div>{isEN ? "Total size" : "总大小"}: {(compressResult.totalSize / 1024).toFixed(1)} KB</div>
                            <div className="text-blue-600 font-medium">
                              {isEN ? "Expires in: " : "剩余时间: "}
                              {Math.max(0, Math.floor((compressExpiryTime - currentTime) / 1000))}s
                            </div>
                            <div className="text-xs text-gray-500">
                              {isEN ? "File will be automatically deleted after expiration" : "文件将在过期后自动删除"}
                            </div>
                          </div>
                        </div>
                      )}

                    </form>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}
     </>
   );
 }
