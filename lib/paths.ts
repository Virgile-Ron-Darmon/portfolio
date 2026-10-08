import os from "node:os";
import path from "node:path";

/** Root of runtime data. Lives outside the app tree so build tooling never sees the clones. */
export const PORTFOLIO_HOME = process.env.PORTFOLIO_HOME?.trim() || path.join(os.homedir(), ".portfolio");
export const REPOS_DIR = path.join(PORTFOLIO_HOME, "repos");
export const DATA_DIR = path.join(PORTFOLIO_HOME, "data");

export const CONTENT_DIR = path.join(process.cwd(), "content");
export const PROJECTS_DIR = path.join(CONTENT_DIR, "projects");
export const FIXTURES_DIR = path.join(process.cwd(), "fixtures");

export const isMock = (process.env.PORTFOLIO_MODE ?? "mock") !== "live";

export const repoDir = (slug: string) => path.join(REPOS_DIR, slug);
export const dataFile = (slug: string) => path.join(DATA_DIR, `${slug}.json`);
