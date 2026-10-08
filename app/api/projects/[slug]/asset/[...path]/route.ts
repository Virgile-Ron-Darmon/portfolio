import fs from "node:fs";
import path from "node:path";
import { findManifestEntry } from "@/lib/data";
import { IMAGE_TYPES } from "@/lib/code-filter";
import { repoDir } from "@/lib/paths";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; path: string[] }> }) {
  const { slug, path: parts } = await params;
  const rel = parts.join("/");
  const entry = findManifestEntry(slug, rel);
  const type = entry ? IMAGE_TYPES[path.extname(entry.path).toLowerCase()] : undefined;
  if (!entry || entry.kind !== "image" || !type) return new Response("Not found", { status: 404 });

  const body = fs.readFileSync(path.join(repoDir(slug), entry.path));
  return new Response(body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
