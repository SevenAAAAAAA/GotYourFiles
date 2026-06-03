import { spawn } from "node:child_process";
import path from "node:path";
import { getProjectsEn, getProjectsZh } from "@/lib/serverData";

function getProjectById(id: string) {
  return getProjectsZh().find((p) => p.id === id) ?? getProjectsEn().find((p) => p.id === id);
}

function normalizeRelativePath(raw: string) {
  const normalized = path.posix
    .normalize(raw.replaceAll("\\", "/"))
    .replace(/^\/+/, "");
  if (normalized === "." || normalized.startsWith("..")) {
    return "";
  }
  return normalized;
}

function resolveRepositoryPath(projectLink: string, rawRelative: string) {
  const rootPath = path.resolve(projectLink);
  const safeRelative = normalizeRelativePath(rawRelative);
  const targetPath = path.resolve(rootPath, safeRelative);
  const isInsideRoot = targetPath === rootPath || targetPath.startsWith(`${rootPath}${path.sep}`);
  return isInsideRoot ? targetPath : rootPath;
}

function execGit(args: string[], cwd: string, timeoutMs = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Git command timed out"));
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const errMsg = Buffer.concat(stderrChunks).toString("utf8").trim();
        reject(new Error(errMsg || `Git exited with code ${code}`));
        return;
      }
      resolve(Buffer.concat(stdoutChunks).toString("utf8").trim());
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function getDefaultBranch(cwd: string): Promise<string> {
  try {
    return await execGit(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  } catch {
    return "";
  }
}

async function remoteRefExists(cwd: string, ref: string) {
  try {
    await execGit(["rev-parse", "--verify", "--quiet", ref], cwd);
    return true;
  } catch {
    return false;
  }
}

async function getRemoteNames(cwd: string) {
  try {
    const output = await execGit(["remote"], cwd);
    return output.split("\n").map((item) => item.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

async function resolveDefaultBaseRef(
  cwd: string,
  branch: string,
  remoteInfos: Array<{ remote: string; branch: string; tracking: string }>,
) {
  const originCurrent = `origin/${branch}`;
  if (await remoteRefExists(cwd, originCurrent)) {
    return originCurrent;
  }

  const remoteNames = await getRemoteNames(cwd);
  for (const remote of remoteNames) {
    const ref = `${remote}/${branch}`;
    if (await remoteRefExists(cwd, ref)) {
      return ref;
    }
  }

  const trackingInfo = remoteInfos.find((r) => r.tracking && !/:/.test(r.tracking.split(":")[0] ?? ""));
  return trackingInfo ? `${trackingInfo.remote}/${trackingInfo.branch}` : "";
}

async function getRemoteInfo(cwd: string): Promise<Array<{ remote: string; branch: string; tracking: string }>> {
  try {
    const output = await execGit(["branch", "-vv"], cwd);
    const lines = output.split("\n").filter(Boolean);
    const results: Array<{ remote: string; branch: string; tracking: string }> = [];
    for (const line of lines) {
      const match = line.match(/^\*?\s*(\S+)\s+[a-f0-9]+\s+\[([^\]].*?)\]/);
      if (match) {
        const tracking = match[2];
        const remoteBranch = tracking.split(":")[0]?.trim() ?? tracking;
        const remoteMatch = remoteBranch.match(/^([^/]+)\/(.+)/);
        if (remoteMatch) {
          results.push({ remote: remoteMatch[1], branch: remoteMatch[2], tracking });
        }
      }
    }
    return results;
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const base = searchParams.get("base")?.trim();
  const rawRelative = searchParams.get("p") ?? "";

  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  const project = getProjectById(id);
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const cwd = resolveRepositoryPath(project.link, rawRelative);
  let branch = "";
  let remoteInfos: Array<{ remote: string; branch: string; tracking: string }> = [];

  try {
    branch = await getDefaultBranch(cwd);
    remoteInfos = await getRemoteInfo(cwd);
  } catch {
    return Response.json({ error: "Not a valid Git repository" }, { status: 400 });
  }

  if (!branch) {
    return Response.json({ error: "Cannot detect current branch" }, { status: 400 });
  }

  const baseRef = base || await resolveDefaultBaseRef(cwd, branch, remoteInfos);

  const commits: Array<{
    hash: string;
    shortHash: string;
    subject: string;
    author: string;
    date: string;
    timestamp: number;
    filesChanged: number;
    fileList: string;
    index: number;
  }> = [];

  try {
    let range = "";
    if (baseRef) {
      try {
        await execGit(["merge-base", baseRef, "HEAD"], cwd);
        range = `${baseRef}..HEAD`;
      } catch {
        range = `HEAD`;
      }
    } else {
      range = `HEAD`;
    }

    const output = await execGit(
      ["log", range, "--format=%H%x1f%h%x1f%s%x1f%an%x1f%ad%x1f%at", "--date=iso", "--no-merges"],
      cwd,
    );

    const lines = output.split("\n").filter(Boolean);
    let index = 0;

    for (const line of lines) {
      const [hash, shortHash, subject, author, date, timestampStr] = line.split("\x1f");
      if (!hash || !shortHash) continue;

      const timestamp = parseInt(timestampStr ?? "0", 10);
      const shortStat = await execGit(["show", "--format=", "--shortstat", hash], cwd).catch(() => "");
      const fileList = await execGit(["show", "--format=", "--name-only", hash], cwd).catch(() => "");
      const match = shortStat.match(/(\d+)\s+files?\s+changed/);
      const filesChanged = match ? parseInt(match[1], 10) : fileList.split("\n").filter(Boolean).length;

      commits.push({
        hash,
        shortHash,
        subject,
        author,
        date,
        timestamp,
        filesChanged,
        fileList,
        index: index++,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: `Failed to read commits: ${message}` }, { status: 500 });
  }

  return Response.json({
    branch,
    remoteInfos,
    baseRef,
    commits,
  });
}
