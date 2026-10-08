"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, FileCode2, FileImage, FileText, FolderTree } from "lucide-react";
import type { ManifestEntry } from "@/lib/types";
import { cn, formatBytes } from "@/lib/utils";

type FileResponse =
  | { kind: "text"; path: string; size: number; html: string; lines: number; lang: string }
  | { kind: "image"; path: string; size: number }
  | { kind: "large"; path: string; size: number };

interface Dir {
  name: string;
  path: string;
  dirs: Dir[];
  files: ManifestEntry[];
}

function buildTree(entries: ManifestEntry[]): Dir {
  const root: Dir = { name: "", path: "", dirs: [], files: [] };
  for (const e of entries) {
    const parts = e.path.split("/");
    let dir = root;
    for (const part of parts.slice(0, -1)) {
      const p = dir.path ? `${dir.path}/${part}` : part;
      let next = dir.dirs.find((d) => d.name === part);
      if (!next) {
        next = { name: part, path: p, dirs: [], files: [] };
        dir.dirs.push(next);
      }
      dir = next;
    }
    dir.files.push(e);
  }
  const sort = (d: Dir) => {
    d.dirs.sort((a, b) => a.name.localeCompare(b.name));
    d.files.sort((a, b) => a.path.localeCompare(b.path));
    d.dirs.forEach(sort);
  };
  sort(root);
  return root;
}

const ancestors = (path: string) => {
  const parts = path.split("/").slice(0, -1);
  return parts.map((_, i) => parts.slice(0, i + 1).join("/"));
};

const iconFor = (e: ManifestEntry) =>
  e.kind === "image" ? FileImage : /\.(md|txt)$/i.test(e.path) ? FileText : FileCode2;

export function CodeBrowser({
  slug,
  manifest,
  initialFile,
  repoUrl,
}: {
  slug: string;
  manifest: ManifestEntry[];
  initialFile: string | null;
  repoUrl: string | null;
}) {
  const tree = useMemo(() => buildTree(manifest), [manifest]);
  const fallback = manifest.find((m) => /^readme/i.test(m.path))?.path ?? manifest[0]?.path ?? null;
  const [selected, setSelected] = useState<string | null>(
    initialFile && manifest.some((m) => m.path === initialFile) ? initialFile : fallback,
  );
  const [open, setOpen] = useState<Set<string>>(() => new Set(selected ? ancestors(selected) : []));
  const [file, setFile] = useState<FileResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [treeOpenMobile, setTreeOpenMobile] = useState(false);
  const cache = useRef(new Map<string, FileResponse>());

  useEffect(() => {
    if (!selected) return;
    const hit = cache.current.get(selected);
    if (hit) {
      setFile(hit);
      setStatus("idle");
      return;
    }
    const ctrl = new AbortController();
    setStatus("loading");
    fetch(`/api/projects/${slug}/file?path=${encodeURIComponent(selected)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: FileResponse) => {
        cache.current.set(selected, data);
        setFile(data);
        setStatus("idle");
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setStatus("error");
      });
    return () => ctrl.abort();
  }, [selected, slug]);

  const select = (path: string) => {
    setSelected(path);
    setTreeOpenMobile(false);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "code");
    url.searchParams.set("file", path);
    window.history.replaceState(window.history.state, "", url);
  };

  const toggle = (path: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  if (!manifest.length) {
    return <p className="font-mono text-sm text-muted">This repository has no files to show.</p>;
  }

  const renderDir = (dir: Dir, depth: number): React.ReactNode => (
    <ul role={depth === 0 ? "tree" : "group"} aria-label={depth === 0 ? "Files" : undefined}>
      {dir.dirs.map((d) => {
        const isOpen = open.has(d.path);
        return (
          <li key={d.path} role="treeitem" aria-expanded={isOpen}>
            <button
              type="button"
              onClick={() => toggle(d.path)}
              className="flex w-full items-center gap-1.5 rounded-[3px] py-[3px] pr-2 text-left text-muted hover:bg-panel-2 hover:text-fg"
              style={{ paddingLeft: 8 + depth * 14 }}
            >
              <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.15 }} className="text-dim">
                <ChevronRight className="size-3.5" />
              </motion.span>
              {d.name}
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  {renderDir(d, depth + 1)}
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
      {dir.files.map((f) => {
        const Icon = iconFor(f);
        const active = f.path === selected;
        return (
          <li key={f.path} role="treeitem" aria-selected={active}>
            <button
              type="button"
              onClick={() => select(f.path)}
              className={cn(
                "relative flex w-full items-center gap-1.5 rounded-[3px] py-[3px] pr-2 text-left",
                active ? "bg-panel-2 text-fg" : "text-muted hover:bg-panel-2/60 hover:text-fg",
              )}
              style={{ paddingLeft: 8 + depth * 14 + 18 }}
            >
              {active && <span className="absolute inset-y-1 left-0 w-[2px] rounded bg-ok" aria-hidden />}
              <Icon className="size-3.5 shrink-0 text-dim" />
              <span className="truncate">{f.path.split("/").pop()}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  const ghFileUrl = repoUrl && selected ? `${repoUrl}/blob/HEAD/${selected}` : null;

  return (
    <div className="overflow-hidden rounded-md border border-line bg-panel/70 md:grid md:h-[72vh] md:min-h-[480px] md:grid-cols-[250px_minmax(0,1fr)]">
      <div className="border-b border-line md:overflow-y-auto md:border-b-0 md:border-r">
        <button
          type="button"
          onClick={() => setTreeOpenMobile((v) => !v)}
          aria-expanded={treeOpenMobile}
          className="flex w-full items-center gap-2 px-4 py-2.5 font-mono text-xs text-muted md:hidden"
        >
          <FolderTree className="size-3.5" />
          {treeOpenMobile ? "Hide files" : `Browse ${manifest.length} files`}
        </button>
        <div className={cn("p-2 font-mono text-[13px]", !treeOpenMobile && "hidden md:block")}>{renderDir(tree, 0)}</div>
      </div>

      <div className="flex min-h-[320px] min-w-0 flex-col">
        <div className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-4 py-2 font-mono text-xs">
          <span className="min-w-0 truncate text-fg">{selected}</span>
          {file && file.path === selected && (
            <span className="text-dim">
              {file.kind === "text" ? `${file.lines} lines, ` : ""}
              {formatBytes(file.size)}
            </span>
          )}
          {ghFileUrl && (
            <a href={ghFileUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-dim hover:text-link">
              View on GitHub
            </a>
          )}
        </div>

        <div className="code-view relative min-h-0 flex-1 overflow-auto">
          {status === "loading" && <LoadingLines />}
          {status === "error" && (
            <p className="p-6 font-mono text-sm text-fail">Couldn&apos;t load this file. Pick it again to retry.</p>
          )}
          {status === "idle" && file && (
            <motion.div key={file.path} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
              {file.kind === "text" && <div dangerouslySetInnerHTML={{ __html: file.html }} />}
              {file.kind === "image" && (
                <div className="flex justify-center p-8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/projects/${slug}/asset/${file.path.split("/").map(encodeURIComponent).join("/")}`}
                    alt={file.path}
                    className="max-h-[60vh] max-w-full rounded border border-line"
                  />
                </div>
              )}
              {file.kind === "large" && (
                <p className="p-6 text-sm text-muted">
                  This file is {formatBytes(file.size)}, too large to show here.
                  {ghFileUrl && (
                    <>
                      {" "}
                      <a href={ghFileUrl} className="text-link underline" target="_blank" rel="noopener noreferrer">
                        Open it on GitHub
                      </a>
                      .
                    </>
                  )}
                </p>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingLines() {
  const widths = [62, 44, 78, 30, 55, 68, 24, 50, 72, 40];
  return (
    <div className="space-y-2.5 p-5" aria-label="Loading file">
      {widths.map((w, i) => (
        <motion.div
          key={i}
          className="h-2.5 rounded-sm bg-panel-2"
          style={{ width: `${w}%` }}
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.06 }}
        />
      ))}
    </div>
  );
}
