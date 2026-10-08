import path from "node:path/posix";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";
import { getHighlighter } from "./highlight";
import { theme } from "./shiki-theme";

interface LinkContext {
  slug: string;
  /** Path of the markdown file inside the repo, used to resolve relative links. Null for files outside a repo. */
  basePath: string | null;
  images: Set<string>;
  files: Set<string>;
}

const isExternal = (url: string) => /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("//");

function resolveRepoPath(basePath: string, url: string): string | null {
  const clean = url.split("#")[0].split("?")[0];
  if (!clean) return null;
  const joined = clean.startsWith("/") ? clean.slice(1) : path.join(path.dirname(basePath), clean);
  const normalized = path.normalize(joined);
  return normalized.startsWith("..") ? null : normalized;
}

/** Points relative README links at the asset route and the Code tab instead of GitHub. */
function rewriteLinks(ctx: LinkContext) {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "img" && typeof node.properties.src === "string") {
        const src = node.properties.src;
        if (isExternal(src)) return;
        const target = ctx.basePath ? resolveRepoPath(ctx.basePath, src) : null;
        if (target && ctx.images.has(target)) {
          node.properties.src = `/api/projects/${ctx.slug}/asset/${target.split("/").map(encodeURIComponent).join("/")}`;
          node.properties.loading = "lazy";
        } else {
          delete node.properties.src;
        }
      }

      if (node.tagName === "a" && typeof node.properties.href === "string") {
        const href = node.properties.href;
        if (href.startsWith("#")) return;
        if (isExternal(href)) {
          node.properties.target = "_blank";
          node.properties.rel = ["noopener", "noreferrer"];
          return;
        }
        const target = ctx.basePath ? resolveRepoPath(ctx.basePath, href) : null;
        if (target && (ctx.files.has(target) || ctx.images.has(target))) {
          node.properties.href = `/projects/${ctx.slug}?tab=code&file=${encodeURIComponent(target)}`;
        } else {
          delete node.properties.href;
        }
      }
    });
  };
}

export async function renderMarkdown(markdown: string, ctx: LinkContext): Promise<string> {
  const highlighter = await getHighlighter();
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rewriteLinks, ctx)
    .use(rehypeShikiFromHighlighter, highlighter, {
      theme: theme.name!,
      defaultLanguage: "text",
      fallbackLanguage: "text",
    })
    .use(rehypeStringify)
    .process(markdown);
  return String(file);
}
