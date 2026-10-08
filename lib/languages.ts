/** Colors follow GitHub's linguist palette where one exists. */
const COLORS: Record<string, string> = {
  HCL: "#844FBA",
  Go: "#00ADD8",
  Python: "#3572A5",
  Shell: "#89e051",
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Makefile: "#427819",
  Dockerfile: "#384d54",
  Jsonnet: "#0064bd",
  Rust: "#dea584",
  Nix: "#7e7eff",
  Lua: "#000080",
  HTML: "#e34c26",
  CSS: "#563d7c",
};

export const languageColor = (name: string) => COLORS[name] ?? "#8b949e";

export function toPercentages(bytes: Record<string, number>) {
  const total = Object.values(bytes).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(bytes)
    .map(([name, n]) => ({ name, percent: Math.round((n / total) * 1000) / 10, color: languageColor(name) }))
    .sort((a, b) => b.percent - a.percent);
}
