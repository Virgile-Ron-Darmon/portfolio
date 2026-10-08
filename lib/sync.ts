import fs from "node:fs";
import path from "node:path";
import { cloneOrPull, latestCommit } from "./git";
import { getLanguages, getLatestRun, getRepoInfo } from "./github";
import { buildManifest, findReadme } from "./manifest";
import { DATA_DIR, dataFile, repoDir } from "./paths";
import type { Project } from "./projects";
import type { ProjectData } from "./types";

const STALE_LOCK_MS = 5 * 60_000;

/** Cross-process lock so the webhook and the sync script never pull the same clone at once. */
async function withLock<T>(slug: string, fn: () => Promise<T>): Promise<T> {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const lock = path.join(DATA_DIR, `${slug}.lock`);
  const deadline = Date.now() + 2 * 60_000;

  for (;;) {
    try {
      fs.writeFileSync(lock, String(process.pid), { flag: "wx" });
      break;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      const age = Date.now() - fs.statSync(lock).mtimeMs;
      if (age > STALE_LOCK_MS) fs.rmSync(lock, { force: true });
      else if (Date.now() > deadline) throw new Error(`Timed out waiting for sync lock on ${slug}`);
      else await new Promise((r) => setTimeout(r, 500));
    }
  }

  try {
    return await fn();
  } finally {
    fs.rmSync(lock, { force: true });
  }
}

function writeData(data: ProjectData) {
  const file = dataFile(data.slug);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file); // atomic swap so readers never see a half-written file
}

export function readProjectData(slug: string): ProjectData | null {
  try {
    return JSON.parse(fs.readFileSync(dataFile(slug), "utf8")) as ProjectData;
  } catch {
    return null;
  }
}

export interface SyncResult {
  slug: string;
  warnings: string[];
  data: ProjectData;
}

export async function syncProject(project: Project): Promise<SyncResult> {
  const { slug, config } = project;
  return withLock(slug, async () => {
    const warnings: string[] = [];
    const info = await getRepoInfo(config.github);
    await cloneOrPull(slug, config.github, info.defaultBranch);

    const codePublished = !info.private || config.publish_private_code;
    if (!codePublished) {
      warnings.push(`${config.github} is private and publish_private_code is not true: code and README are hidden`);
    }

    const [languages, ci, commit] = await Promise.all([
      getLanguages(config.github),
      getLatestRun(config.github, info.defaultBranch),
      latestCommit(slug),
    ]);

    const manifest = codePublished ? buildManifest(repoDir(slug), config.code.exclude) : [];
    const data: ProjectData = {
      slug,
      syncedAt: new Date().toISOString(),
      visibility: info.private ? "private" : "public",
      codePublished,
      commit,
      languages,
      ci,
      readmePath: codePublished ? findReadme(manifest) : null,
      manifest,
    };
    writeData(data);
    return { slug, warnings, data };
  });
}

/** Called for workflow_run webhooks: only the CI status changes. */
export async function refreshCi(project: Project): Promise<void> {
  await withLock(project.slug, async () => {
    const current = readProjectData(project.slug);
    if (!current) return;
    const info = await getRepoInfo(project.config.github);
    current.ci = await getLatestRun(project.config.github, info.defaultBranch);
    current.syncedAt = new Date().toISOString();
    writeData(current);
  });
}
