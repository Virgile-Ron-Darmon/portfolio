import { createHighlighter, type Highlighter } from "shiki";
import { theme } from "./shiki-theme";

const LANGS = [
  "typescript", "tsx", "javascript", "jsx", "json", "yaml", "toml", "markdown", "bash", "go",
  "python", "hcl", "dockerfile", "make", "sql", "css", "html", "ini", "rust", "jsonnet", "nix",
] as const;

const BY_EXT: Record<string, string> = {
  ts: "typescript", mts: "typescript", cts: "typescript", tsx: "tsx", js: "javascript", mjs: "javascript",
  cjs: "javascript", jsx: "jsx", json: "json", yml: "yaml", yaml: "yaml", toml: "toml", md: "markdown",
  sh: "bash", bash: "bash", zsh: "bash", go: "go", py: "python", tf: "hcl", hcl: "hcl", tfvars: "hcl",
  sql: "sql", css: "css", html: "html", ini: "ini", cfg: "ini", rs: "rust", jsonnet: "jsonnet",
  libsonnet: "jsonnet", nix: "nix", conf: "ini",
};

const BY_NAME: Record<string, string> = { dockerfile: "dockerfile", makefile: "make" };

export function langFor(path: string): string {
  const base = path.split("/").pop()!.toLowerCase();
  if (BY_NAME[base]) return BY_NAME[base];
  const ext = base.includes(".") ? base.split(".").pop()! : "";
  return BY_EXT[ext] ?? "text";
}

let highlighter: Promise<Highlighter> | null = null;
export function getHighlighter() {
  highlighter ??= createHighlighter({ themes: [theme], langs: [...LANGS] });
  return highlighter;
}

export async function highlight(code: string, lang: string): Promise<string> {
  const hl = await getHighlighter();
  const safeLang = hl.getLoadedLanguages().includes(lang) ? lang : "text";
  return hl.codeToHtml(code, { lang: safeLang, theme: theme.name! });
}
