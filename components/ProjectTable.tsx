import Link from "next/link";
import { CIStatusBadge, StatusDot } from "./CIStatusBadge";
import { LanguageBar } from "./LanguageBar";
import { RelativeTime } from "./RelativeTime";
import type { ProjectSummary } from "@/lib/data";

/** Projects as a process list: one row per project, everything scannable on one line. */
export function ProjectTable({ projects }: { projects: ProjectSummary[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-panel/60">
      <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.8fr)] gap-6 border-b border-line px-5 py-2.5 font-mono text-xs text-dim md:grid">
        <span>project</span>
        <span>languages</span>
        <span>ci</span>
        <span>last commit</span>
      </div>
      <ul className="divide-y divide-line">
        {projects.map((p) => (
          <li key={p.slug} className="group relative">
            <div className="grid gap-3 px-5 py-4 transition-colors group-hover:bg-panel-2/70 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.8fr)] md:items-center md:gap-6">
              <div className="min-w-0">
                <div className="flex items-baseline gap-2.5">
                  <StatusDot state={p.data?.ci?.state ?? "unknown"} className="translate-y-[-1px]" />
                  <Link
                    href={`/projects/${p.slug}`}
                    className="font-mono text-[15px] text-fg after:absolute after:inset-0 after:content-[''] group-hover:text-white"
                  >
                    {p.name}
                  </Link>
                  {p.data?.visibility === "private" && (
                    <span className="rounded-sm border border-line-strong px-1.5 font-mono text-[11px] leading-5 text-dim">
                      private
                    </span>
                  )}
                </div>
                <p className="mt-1 pl-[18px] text-sm leading-snug text-muted">{p.summary}</p>
              </div>
              <div className="pl-[18px] md:pl-0">
                <LanguageBar languages={p.data?.languages ?? []} legend={false} />
                <p className="mt-1.5 truncate font-mono text-xs text-dim">
                  {p.data?.languages
                    .slice(0, 3)
                    .map((l) => l.name)
                    .join(", ")}
                </p>
              </div>
              <div className="relative z-10 pl-[18px] md:pl-0">
                <CIStatusBadge ci={p.data?.ci ?? null} />
              </div>
              <div className="pl-[18px] font-mono text-xs text-dim md:pl-0">
                {p.data?.commit ? (
                  <>
                    <span className="text-muted">{p.data.commit.sha.slice(0, 7)}</span>{" "}
                    <RelativeTime iso={p.data.commit.date} />
                  </>
                ) : (
                  "not synced"
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
