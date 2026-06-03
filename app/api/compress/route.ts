import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
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

type FlowNode = {
  id: string;
  type: "animation" | "wait_event" | "action" | "ui" | "dismiss";
  slot?: "display" | "interactive";
  animation?: string;
  event?: string;
  hitAreas?: Array<{ event: string; frame: { x: number; y: number; w: number; h: number } }>;
  on?: Record<string, string>;
};

type FlowConfigPayload = {
  version: number;
  entry: string;
  animations: Record<string, string>;
  nodes: FlowNode[];
  transitions: unknown[];
  designWidth?: number;
  designHeight?: number;
  closeButton?: { frame: { x: number; y: number; w: number; h: number } };
};

function isFiniteNumber(v: unknown) {
  return typeof v === "number" && Number.isFinite(v);
}

function validateFlowConfig(config: unknown, uploadedFilenames: string[]): string[] {
  const errors: string[] = [];
  if (!config || typeof config !== "object") {
    return ["flowConfig must be a JSON object"];
  }
  const flow = config as Partial<FlowConfigPayload>;
  if (!isFiniteNumber(flow.version)) errors.push("flowConfig.version must be a number");
  if (!flow.entry || typeof flow.entry !== "string") errors.push("flowConfig.entry must be a string");
  if (!flow.animations || typeof flow.animations !== "object" || Array.isArray(flow.animations)) {
    errors.push("flowConfig.animations must be an object");
  }
  if (!Array.isArray(flow.nodes)) errors.push("flowConfig.nodes must be an array");
  if (!Array.isArray(flow.transitions)) errors.push("flowConfig.transitions must be an array");

  if (flow.nodes && Array.isArray(flow.nodes) && flow.entry && typeof flow.entry === "string") {
    const nodeIds = new Set(flow.nodes.map((node) => node?.id));
    if (!nodeIds.has(flow.entry)) {
      errors.push(`flowConfig.entry "${flow.entry}" does not exist in nodes`);
    }
  }

  if (flow.animations && typeof flow.animations === "object" && !Array.isArray(flow.animations)) {
    for (const [key, filename] of Object.entries(flow.animations)) {
      if (!filename || typeof filename !== 'string') {
        errors.push(`flowConfig.animations.${key} must be a non-empty string`);
        continue;
      }
      if (!uploadedFilenames.includes(filename)) {
        errors.push(`flowConfig.animations.${key} references missing file "${filename}"`);
      }
    }
  }

  if (Array.isArray(flow.nodes)) {
    const animationKeys = new Set(Object.keys((flow.animations ?? {}) as Record<string, string>));
    for (const node of flow.nodes) {
      if (!node || typeof node !== 'object') {
          errors.push("flowConfig.nodes item must be an object");
        continue;
      }
      if (!node.id || typeof node.id !== "string") errors.push("flowConfig.nodes[].id must be a string");
      if (!node.type || !["animation", "wait_event", "action", "ui", "dismiss"].includes(node.type)) {
        errors.push(`flowConfig node "${node.id ?? 'unknown'}" has invalid type`);
      }
      if (node.type === 'animation') {
        if (!node.animation || typeof node.animation !== 'string') {
          errors.push(`animation node "${node.id}" requires animation key`);
        } else if (!animationKeys.has(node.animation)) {
          errors.push(`animation node "${node.id}" references unknown animation key "${node.animation}"`);
        }
      }
      if (node.hitAreas) {
        if (!Array.isArray(node.hitAreas)) {
          errors.push(`node "${node.id}" hitAreas must be an array`);
        } else {
          const events = new Set<string>();
          for (const area of node.hitAreas) {
            if (!area?.event || typeof area.event !== 'string') {
              errors.push(`node "${node.id}" hitAreas.event must be a string`);
            } else if (events.has(area.event)) {
              errors.push(`node "${node.id}" hitAreas has duplicate event "${area.event}"`);
            } else {
              events.add(area.event);
            }
            const frame = area?.frame;
            if (!frame || !isFiniteNumber(frame.x) || !isFiniteNumber(frame.y) || !isFiniteNumber(frame.w) || !isFiniteNumber(frame.h)) {
              errors.push(`node "${node.id}" hitAreas.frame must contain numeric x/y/w/h`);
            } else if (frame.w <= 0 || frame.h <= 0) {
              errors.push(`node "${node.id}" hitAreas.frame requires w/h > 0`);
            }
          }
        }
      }
    }
  }
  return errors;
}

export async function POST(request: NextRequest) {
  try {
    await cleanupExpiredCache();
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const customFilename = formData.get("filename") as string | null;
    const addFlowConfig = formData.get("addFlowConfig") === "true";
    const flowConfigContent = formData.get("flowConfigContent") as string | null;
    
    if (!files || files.length === 0) {
      return NextResponse.json(
          { error: "No files provided" },
        { status: 400 }
        );
    }

    const zip = new JSZip();
    
    // 添加所有文件到ZIP
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      zip.file(file.name, arrayBuffer);
    }

    // 添加flowConfig.json文件（如果请求）
    if (addFlowConfig) {
      if (!flowConfigContent || !flowConfigContent.trim()) {
        return NextResponse.json(
          { error: 'flowConfig content is required' },
          { status: 400 }
        );
      }
      let parsedFlowConfig: unknown;
      try {
        parsedFlowConfig = JSON.parse(flowConfigContent);
      } catch {
        return NextResponse.json(
          { error: 'flowConfig content must be valid JSON' },
          { status: 400 }
        );
      }
      const fileNames = files.map((file) => file.name);
      const validationErrors = validateFlowConfig(parsedFlowConfig, fileNames);
      if (validationErrors.length > 0) {
        return NextResponse.json(
          { error: `Invalid flowConfig: ${validationErrors.join('; ')}` },
          { status: 400 }
        );
      }
      zip.file("flowConfig.json", JSON.stringify(parsedFlowConfig, null, 2));
    }

    // 生成ZIP文件
    const zipData = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6,
      },
      platform: "UNIX",
      comment: "Generated by GotYourFiles",
      encodeFileName: (filename) => filename,
    });

    const filename = customFilename
      ? `${customFilename}.zip`
      : `compressed-${Date.now()}.zip`;
    const cached = await createCachedZip(filename, zipData);

    return NextResponse.json({
      success: true,
      cacheId: cached.cacheId,
      filename,
      fileCount: files.length,
      totalSize: zipData.length,
      expiresAt: cached.expiresAt,
    });

  } catch (error) {
    console.error("Compression error:", error);
    return NextResponse.json(
      { error: "Failed to compress files" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await cleanupExpiredCache();
    const { searchParams } = new URL(request.url);
    const cacheId = searchParams.get("id");
    
    if (!cacheId) {
      return NextResponse.json(
        { error: "No cache ID provided" },
        { status: 400 }
      );
    }

    const cached = await readCachedZip(cacheId);
    if (!cached) {
      return NextResponse.json(
        { error: "File not found or expired" },
        { status: 404 }
      );
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
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cacheId = searchParams.get("id");
    if (!cacheId) {
      return NextResponse.json({ error: "No cache ID provided" }, { status: 400 });
    }

    await deleteCachedZip(cacheId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete zip error:", error);
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
