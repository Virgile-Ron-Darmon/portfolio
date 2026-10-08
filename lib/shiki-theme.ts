import type { ThemeRegistration } from "shiki";

/** Matches the site palette: graphite base, status colors reused for syntax. */
export const theme: ThemeRegistration = {
  name: "console",
  type: "dark",
  colors: { "editor.background": "#00000000", "editor.foreground": "#c9d1d9" },
  tokenColors: [
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: "#5c6570", fontStyle: "italic" } },
    { scope: ["string", "string.quoted", "markup.inline.raw"], settings: { foreground: "#9fd8a8" } },
    { scope: ["constant.numeric", "constant.language", "constant.character"], settings: { foreground: "#f0b75e" } },
    { scope: ["keyword", "storage", "storage.type", "keyword.control"], settings: { foreground: "#8ab4f8" } },
    { scope: ["entity.name.function", "support.function", "meta.function-call"], settings: { foreground: "#e6d2a2" } },
    { scope: ["entity.name.type", "support.type", "entity.name.class"], settings: { foreground: "#7fd1d1" } },
    { scope: ["variable.parameter", "variable.other.property", "meta.object-literal.key"], settings: { foreground: "#c9d1d9" } },
    { scope: ["entity.name.tag", "entity.other.attribute-name"], settings: { foreground: "#8ab4f8" } },
    { scope: ["punctuation", "meta.brace"], settings: { foreground: "#8b949e" } },
    { scope: ["markup.heading", "entity.name.section"], settings: { foreground: "#e6d2a2", fontStyle: "bold" } },
    { scope: ["variable.other.readwrite", "variable"], settings: { foreground: "#c9d1d9" } },
  ],
};
