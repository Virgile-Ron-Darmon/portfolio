import fs from "node:fs";
import path from "node:path";
import { FIXTURES_DIR, isMock } from "./paths";
import { toPercentages } from "./languages";
import type { CiRun, CiState, Language } from "./types";

const API = "https://api.github.com";

async function gh<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API}${endpoint}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GitHub ${endpoint} returned ${res.status}`);
  return res.json() as Promise<T>;
}

interface Fixture {
  private: boolean;
  default_branch: string;
  languages: Record<string, number>;
  run: {
    status: string;
    conclusion: string | null;
    name: string;
    head_branch: string;
    run_started_at_minutes_ago: number;
    duration_sec: number | null;
  } | null;
}

function fixture(repo: string): Fixture {
  const name = repo.split("/")[1];
  return JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, "github", `${name}.json`), "utf8"));
}

export async function getRepoInfo(repo: string): Promise<{ private: boolean; defaultBranch: string }> {
  if (isMock) {
    const f = fixture(repo);
    return { private: f.private, defaultBranch: f.default_branch };
  }
  const r = await gh<{ private: boolean; default_branch: string }>(`/repos/${repo}`);
  return { private: r.private, defaultBranch: r.default_branch };
}

export async function getLanguages(repo: string): Promise<Language[]> {
  const bytes = isMock ? fixture(repo).languages : await gh<Record<string, number>>(`/repos/${repo}/languages`);
  return toPercentages(bytes);
}

function toState(status: string, conclusion: string | null): CiState {
  if (status === "queued" || status === "waiting" || status === "pending") return "queued";
  if (status !== "completed") return "in_progress";
  if (conclusion === "success") return "success";
  if (conclusion === "cancelled" || conclusion === "skipped") return "cancelled";
  if (conclusion) return "failure";
  return "unknown";
}

export async function getLatestRun(repo: string, branch: string): Promise<CiRun | null> {
  if (isMock) {
    const run = fixture(repo).run;
    if (!run) return null;
    return {
      state: toState(run.status, run.conclusion),
      workflow: run.name,
      branch: run.head_branch,
      durationSec: run.duration_sec,
      startedAt: new Date(Date.now() - run.run_started_at_minutes_ago * 60_000).toISOString(),
      url: `https://github.com/${repo}/actions`,
    };
  }

  type Run = {
    status: string;
    conclusion: string | null;
    name: string;
    head_branch: string;
    run_started_at: string;
    updated_at: string;
    html_url: string;
  };
  const { workflow_runs } = await gh<{ workflow_runs: Run[] }>(
    `/repos/${repo}/actions/runs?branch=${encodeURIComponent(branch)}&per_page=1`,
  );
  const run = workflow_runs[0];
  if (!run) return null;
  const state = toState(run.status, run.conclusion);
  const done = run.status === "completed";
  return {
    state,
    workflow: run.name,
    branch: run.head_branch,
    durationSec: done
      ? Math.round((new Date(run.updated_at).getTime() - new Date(run.run_started_at).getTime()) / 1000)
      : null,
    startedAt: run.run_started_at,
    url: run.html_url,
  };
}
