import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { FIXTURES_DIR, REPOS_DIR, isMock, repoDir } from "./paths";
import type { Commit } from "./types";

const run = promisify(execFile);

async function git(args: string[], opts: { cwd?: string; env?: Record<string, string> } = {}) {
  const { stdout } = await run("git", args, {
    cwd: opts.cwd,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", ...opts.env },
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout.trim();
}

function cloneUrl(repo: string) {
  const base = process.env.GIT_CLONE_BASE?.trim() || "https://github.com/";
  return `${base}${repo}.git`;
}

/** Clones the repo into REPOS_DIR/<slug>, or fast-forwards it to the remote default branch. */
export async function cloneOrPull(slug: string, repo: string, branch: string) {
  const dir = repoDir(slug);
  fs.mkdirSync(REPOS_DIR, { recursive: true });

  if (isMock) return seedFixture(slug, repo);

  if (!fs.existsSync(path.join(dir, ".git"))) {
    await git(["clone", "--depth", "50", "--branch", branch, cloneUrl(repo), dir]);
    return;
  }
  await git(["fetch", "--depth", "50", "origin", branch], { cwd: dir });
  await git(["reset", "--hard", `origin/${branch}`], { cwd: dir });
  await git(["clean", "-fdx"], { cwd: dir });
}

/** Mock mode: turn fixtures/repos/<slug> into a real git repo so the rest of the pipeline is identical. */
async function seedFixture(slug: string, repo: string) {
  const src = path.join(FIXTURES_DIR, "repos", slug);
  const meta = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "github", `${repo.split("/")[1]}.json`), "utf8"));
  const dir = repoDir(slug);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.cpSync(src, dir, { recursive: true });

  const when = new Date(Date.now() - (meta.commit_hours_ago ?? 24) * 3_600_000).toISOString();
  const env = { GIT_AUTHOR_DATE: when, GIT_COMMITTER_DATE: when };
  const id = ["-c", "user.name=portfolio-mock", "-c", "user.email=mock@example.com", "-c", "commit.gpgsign=false"];
  await git(["init", "-q", "-b", meta.default_branch ?? "main"], { cwd: dir });
  await git([...id, "add", "-A"], { cwd: dir });
  await git([...id, "commit", "-q", "-m", meta.commit_message ?? "Initial import"], { cwd: dir, env });
}

export async function latestCommit(slug: string): Promise<Commit | null> {
  try {
    const out = await git(["log", "-1", "--format=%H%x00%s%x00%cI"], { cwd: repoDir(slug) });
    const [sha, message, date] = out.split("\0");
    return { sha, message, date };
  } catch {
    return null;
  }
}
