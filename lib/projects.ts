import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { z } from "zod";
import { CONTENT_DIR, PROJECTS_DIR } from "./paths";
import {
  infraConfigSchema,
  projectConfigSchema,
  siteConfigSchema,
  type InfraConfig,
  type ProjectConfig,
  type SiteConfig,
} from "./schema";

export interface Project {
  /** The folder name under content/projects is the slug. */
  slug: string;
  dir: string;
  config: ProjectConfig;
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

function readYaml<T>(file: string, schema: z.ZodType<T>): T {
  const raw = YAML.parse(fs.readFileSync(file, "utf8"));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const rel = path.relative(process.cwd(), file);
    throw new Error(`Invalid ${rel}:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

function allowedDemoOrigins(): string[] {
  return [process.env.DEMO_ORIGIN, process.env.GRAFANA_ORIGIN]
    .filter((o): o is string => Boolean(o))
    .map((o) => new URL(o).origin);
}

function validateDemoUrls(slug: string, config: ProjectConfig) {
  const allowed = allowedDemoOrigins();
  for (const tab of config.tabs) {
    if (tab.type !== "demo") continue;
    const origin = new URL(tab.url).origin;
    if (!allowed.includes(origin)) {
      throw new Error(
        `content/projects/${slug}/config.yaml: demo url origin ${origin} is not allowed. ` +
          `Allowed: ${allowed.join(", ") || "(none, set DEMO_ORIGIN / GRAFANA_ORIGIN)"}`,
      );
    }
  }
}

export function getAllProjects(): Project[] {
  if (!fs.existsSync(PROJECTS_DIR)) return [];
  const projects: Project[] = [];
  for (const slug of fs.readdirSync(PROJECTS_DIR)) {
    const dir = path.join(PROJECTS_DIR, slug);
    const file = path.join(dir, "config.yaml");
    if (!fs.existsSync(file)) continue;
    if (!SLUG_RE.test(slug)) {
      throw new Error(`content/projects/${slug}: folder names are slugs and must be lowercase letters, digits and dashes`);
    }
    const config = readYaml(file, projectConfigSchema);
    validateDemoUrls(slug, config);
    projects.push({ slug, dir, config });
  }
  return projects.sort((a, b) => a.config.order - b.config.order || a.slug.localeCompare(b.slug));
}

export function getProjectBySlug(slug: string): Project | undefined {
  return getAllProjects().find((p) => p.slug === slug);
}

export function getProjectByRepo(fullName: string): Project | undefined {
  const needle = fullName.toLowerCase();
  return getAllProjects().find((p) => p.config.github.toLowerCase() === needle);
}

export function getSiteConfig(): SiteConfig {
  return readYaml(path.join(CONTENT_DIR, "site.yaml"), siteConfigSchema);
}

export function getInfraConfig(): InfraConfig {
  return readYaml(path.join(CONTENT_DIR, "infrastructure.yaml"), infraConfigSchema);
}

/** Reads a markdown file that lives next to a project's config (custom description source). */
export function readProjectFile(project: Project, file: string): string | null {
  const full = path.resolve(project.dir, file);
  if (!full.startsWith(project.dir + path.sep)) return null;
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : null;
}
