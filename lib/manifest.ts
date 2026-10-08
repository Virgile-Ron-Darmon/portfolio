import fs from "node:fs";
import path from "node:path";
import { createFilter, IMAGE_SIZE_CAP, IMAGE_TYPES, TEXT_SIZE_CAP } from "./code-filter";
import type { ManifestEntry } from "./types";

function looksBinary(file: string): boolean {
  const fd = fs.openSync(file, "r");
  try {
    const buf = Buffer.alloc(8000);
    const n = fs.readSync(fd, buf, 0, buf.length, 0);
    return buf.subarray(0, n).includes(0);
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Walks a clone and records every publishable file. The manifest is the gatekeeper:
 * routes only ever serve paths that appear in it, so path traversal is impossible.
 */
export function buildManifest(root: string, excludes: string[]): ManifestEntry[] {
  const allowed = createFilter(excludes);
  const out: ManifestEntry[] = [];

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(root, full).split(path.sep).join("/");
      if (entry.isSymbolicLink()) continue; // never follow links out of the clone
      if (entry.isDirectory()) {
        if (allowed(rel + "/x")) walk(full);
        continue;
      }
      if (!entry.isFile() || !allowed(rel)) continue;

      const size = fs.statSync(full).size;
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_TYPES[ext]) {
        if (size <= IMAGE_SIZE_CAP) out.push({ path: rel, size, kind: "image" });
        continue;
      }
      if (looksBinary(full)) continue;
      out.push({ path: rel, size, kind: size > TEXT_SIZE_CAP ? "large" : "text" });
    }
  };

  walk(root);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

export function findReadme(manifest: ManifestEntry[]): string | null {
  const hit = manifest.find((e) => /^readme(\.md|\.markdown)?$/i.test(e.path));
  return hit?.path ?? null;
}
