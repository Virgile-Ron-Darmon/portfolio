import { z } from "zod";

const descriptionTab = z.object({
  type: z.literal("description"),
  source: z.enum(["readme", "custom"]).default("readme"),
  /** Markdown file inside the project folder, used when source is custom. */
  file: z.string().default("description.md"),
});

const demoTab = z.object({
  type: z.literal("demo"),
  kind: z.enum(["shell", "grafana", "custom"]),
  url: z.url(),
});

const codeTab = z.object({
  type: z.literal("code"),
});

export const tabSchema = z.discriminatedUnion("type", [descriptionTab, demoTab, codeTab]);

export const projectConfigSchema = z
  .object({
    name: z.string().min(1),
    summary: z.string().min(1),
    github: z.string().regex(/^[\w.-]+\/[\w.-]+$/, "github must look like owner/repo"),
    publish_private_code: z.boolean().default(false),
    /** Lower numbers are listed first. */
    order: z.number().int().default(100),
    code: z
      .object({
        exclude: z.array(z.string()).default([]),
      })
      .default({ exclude: [] }),
    tabs: z.array(tabSchema).min(1, "at least one tab is required"),
  })
  .superRefine((cfg, ctx) => {
    const seen = new Set<string>();
    for (const tab of cfg.tabs) {
      if (seen.has(tab.type)) {
        ctx.addIssue({ code: "custom", message: `tab "${tab.type}" appears more than once`, path: ["tabs"] });
      }
      seen.add(tab.type);
    }
  });

export type ProjectConfig = z.infer<typeof projectConfigSchema>;
export type TabConfig = z.infer<typeof tabSchema>;
export type TabType = TabConfig["type"];

export const siteConfigSchema = z.object({
  name: z.string(),
  handle: z.string(),
  role: z.string(),
  tagline: z.string(),
  location: z.string().optional(),
  links: z.array(z.object({ label: z.string(), url: z.url() })).default([]),
});
export type SiteConfig = z.infer<typeof siteConfigSchema>;

const side = z.enum(["top", "right", "bottom", "left"]);

export const infraConfigSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      kind: z.enum(["edge", "app", "service", "data", "observability", "external", "switch", "server"]),
      x: z.number(),
      y: z.number(),
      detail: z.string(),
      tech: z.string().optional(),
      /** Any CSS colour. Overrides the kind's colour for the dot and border. */
      color: z.string().optional(),
    }),
  ),
  edges: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      label: z.string().optional(),
      flow: z.boolean().default(true),
      fromSide: side.default("right"),
      toSide: side.default("left"),
      style: z.enum(["solid", "dashed", "dotted"]).default("solid"),
      double: z.boolean().default(false),
      /** Any CSS colour. */
      color: z.string().optional(),
    }),
  ),
});
export type InfraConfig = z.infer<typeof infraConfigSchema>;
export type InfraSide = z.infer<typeof side>;