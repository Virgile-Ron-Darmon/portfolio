import { NextResponse } from "next/server";
import { findManifestEntry, getHighlightedFile } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const filePath = new URL(req.url).searchParams.get("path") ?? "";
  const entry = findManifestEntry(slug, filePath);
  if (!entry) return NextResponse.json({ error: "File not found" }, { status: 404 });

  if (entry.kind === "image") {
    return NextResponse.json({ kind: "image", path: entry.path, size: entry.size });
  }
  if (entry.kind === "large") {
    return NextResponse.json({ kind: "large", path: entry.path, size: entry.size });
  }
  const file = await getHighlightedFile(slug, entry);
  return NextResponse.json({ kind: "text", path: entry.path, size: entry.size, ...file });
}
