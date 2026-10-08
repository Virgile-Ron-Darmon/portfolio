import "server-only";
import fs from "node:fs";
import path from "node:path";
import { unstable_cache } from "next/cache";
import { getAllProjects, getProjectBySlug, readProjectFile, type Project } from "./projects";
import { readProjectData } from "./sync";
import { renderMarkdown } from "./markdown";
import { highlight, langFor } from "./highlight";
import { repoDir } from "./paths";
import type { ManifestEntry, ProjectData } from "./types";

export const projectTag = (slug: string) => `project:${slug}`;

export interface ProjectSummary {
  slug: string;
  name: string;
  summary: string;
  github: string;
  data: ProjectData | null;
}

const toSummary = (p: Project): ProjectSummary => ({
  slug: p.slug,
  name: p.config.name,
  summary: p.config.summary,
  github: p.config.github,
  data: readProjectData(p.slug),
});

export async function listProjects(): Promise<ProjectSummary[]> {
  const projects = getAllProjects();
  return unstable_cache(async () => projects.map(toSummary), ["projects", ...projects.map((p) => p.slug)], {
    tags: ["projects", ...projects.map((p) => projectTag(p.slug))],
  })();
}

export async function getProjectView(slug: string) {
  const project = getProjectBySlug(slug);
  if (!project) return null;

  return unstable_cache(
    async () => {
      const data = readProjectData(slug);
      const tabs = project.config.tabs.filter((t) => t.type !== "code" || data?.codePublished);
      const descTab = project.config.tabs.find((t) => t.type === "description");

      let descriptionHtml: string | null = null;
      if (descTab && descTab.type === "description" && data) {
        const images = new Set(data.manifest.filter((m) => m.kind === "image").map((m) => m.path));
        const files = new Set(data.manifest.filter((m) => m.kind !== "image").map((m) => m.path));
        if (descTab.source === "readme" && data.readmePath) {
          const md = fs.readFileSync(path.join(repoDir(slug), data.readmePath), "utf8");
          descriptionHtml = await renderMarkdown(md, { slug, basePath: data.readmePath, images, files });
        } else if (descTab.source === "custom") {
          const md = readProjectFile(project, descTab.file);
          if (md) descriptionHtml = await renderMarkdown(md, { slug, basePath: null, images, files });
        }
      }

      return {
        slug,
        config: project.config,
        tabs,
        data,
        descriptionHtml,
      };
    },
    ["project-view", slug],
    { tags: [projectTag(slug)] },
  )();
}

export type ProjectView = NonNullable<Awaited<ReturnType<typeof getProjectView>>>;

/** Looks a path up in the manifest. Anything not listed is never read. */
export function findManifestEntry(slug: string, filePath: string): ManifestEntry | null {
  const data = readProjectData(slug);
  if (!data?.codePublished) return null;
  return data.manifest.find((m) => m.path === filePath) ?? null;
}

export async function getHighlightedFile(slug: string, entry: ManifestEntry) {
  const sha = readProjectData(slug)?.commit?.sha ?? "none";
  return unstable_cache(
    async () => {
      const code = fs.readFileSync(path.join(repoDir(slug), entry.path), "utf8").replace(/\n$/, "");
      const lang = langFor(entry.path);
      return { html: await highlight(code, lang), lines: code.split("\n").length, lang };
    },
    ["file", slug, sha, entry.path],
    { tags: [projectTag(slug)] },
  )();
}
