import Link from "next/link";
import { BootLog, type LogLine } from "@/components/BootLog";
import { ProjectTable } from "@/components/ProjectTable";
import { getSiteConfig } from "@/lib/projects";
import { listProjects, type ProjectSummary } from "@/lib/data";
import { formatDuration } from "@/lib/utils";

function bootLines(projects: ProjectSummary[]): LogLine[] {
  const width = Math.max(...projects.map((p) => p.slug.length)) + 2;
  const lines: LogLine[] = projects.map((p) => {
    const ci = p.data?.ci;
    const running = ci?.state === "in_progress" || ci?.state === "queued";
    const failed = ci?.state === "failure";
    return [
      { text: "  " },
      p.data ? { text: "ok", tone: "ok" } : { text: "--", tone: "dim" },
      { text: "  " },
      { text: p.slug.padEnd(width), tone: "fg" },
      { text: (p.data?.commit?.sha.slice(0, 7) ?? "-------") + "  ", tone: "dim" },
      { text: "ci " },
      ci
        ? { text: running ? "running" : failed ? "failing" : "passing", tone: running ? "warn" : failed ? "fail" : "ok" }
        : { text: "none", tone: "dim" },
      { text: ci?.durationSec != null ? `  ${formatDuration(ci.durationSec)}` : "", tone: "dim" },
    ];
  });

  const synced = projects
    .map((p) => p.data?.syncedAt)
    .filter((s): s is string => Boolean(s))
    .sort()
    .pop();
  const time = synced ? new Date(synced).toISOString().slice(11, 16) + " UTC" : "never";
  lines.push([{ text: `  ${projects.length} projects synced, last run ${time}`, tone: "dim" }]);
  return lines;
}

export default async function HomePage() {
  const site = getSiteConfig();
  const projects = await listProjects();

  return (
    <>
      <BootLog command="portfolio sync" lines={bootLines(projects)} name={site.name}>
        <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-muted">
          <span className="text-fg">{site.role}.</span> {site.tagline}
        </p>
        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[13px]">
          {site.links.map((l) => (
            <li key={l.label}>
              <a href={l.url} className="text-link underline decoration-link/30 hover:decoration-link">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </BootLog>

      <section aria-labelledby="projects-heading" className="mt-24">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 id="projects-heading" className="font-mono text-sm text-muted">
            Projects
          </h2>
          <Link href="/projects" className="font-mono text-xs text-dim hover:text-fg">
            View all {projects.length}
          </Link>
        </div>
        <ProjectTable projects={projects} />
      </section>

      <section aria-label="How this site runs" className="mt-16 grid gap-4 md:grid-cols-2">
        <Pane
          title="infrastructure"
          href="/infrastructure"
          cta="Explore the diagram"
          body="Where this site runs: the proxy, the services behind it, and how a push to GitHub ends up on this page."
        />
        <Pane
          title="metrics"
          href="/observability"
          cta="Open the dashboard"
          body="Live Grafana panels for the same infrastructure: traffic, latency, and how much error budget is left this month."
        />
      </section>
    </>
  );
}

function Pane({ title, href, cta, body }: { title: string; href: string; cta: string; body: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-md border border-line bg-panel/60 transition-colors hover:border-line-strong"
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-2 font-mono text-xs text-dim">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2 rounded-full bg-line-strong" />
          <span className="size-2 rounded-full bg-line-strong" />
          <span className="size-2 rounded-full bg-line-strong" />
        </span>
        <span className="ml-1">~/{title}</span>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <p className="max-w-[48ch] text-[15px] text-muted">{body}</p>
        <span className="mt-auto font-mono text-[13px] text-link group-hover:underline">{cta}</span>
      </div>
    </Link>
  );
}
