import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CIStatusBadge } from "@/components/CIStatusBadge";
import { CodeBrowser } from "@/components/CodeBrowser";
import { LanguageBar } from "@/components/LanguageBar";
import { ProjectTabs } from "@/components/ProjectTabs";
import { RelativeTime } from "@/components/RelativeTime";
import { DemoPanel } from "@/components/demo/DemoPanel";
import { getProjectView } from "@/lib/data";
import { getAllProjects } from "@/lib/projects";
import type { TabType } from "@/lib/schema";

type Params = Promise<{ slug: string }>;
type Search = Promise<{ tab?: string; file?: string }>;

export function generateStaticParams() {
  return getAllProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const view = await getProjectView((await params).slug);
  return view ? { title: view.config.name, description: view.config.summary } : {};
}

export default async function ProjectPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { slug } = await params;
  const { tab, file } = await searchParams;
  const view = await getProjectView(slug);
  if (!view) notFound();

  const { config, data, tabs, descriptionHtml } = view;
  const tabTypes = tabs.map((t) => t.type);
  const initial = (tabTypes.includes(tab as TabType) ? tab : tabTypes[0]) as TabType;
  const repoUrl = data?.visibility === "public" ? `https://github.com/${config.github}` : null;

  const panels: Partial<Record<TabType, React.ReactNode>> = {};
  for (const t of tabs) {
    if (t.type === "description") {
      panels.description = descriptionHtml ? (
        <article className="prose-console" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
      ) : (
        <div className="prose-console">
          <p>{config.summary}</p>
          {data?.visibility === "private" && <p className="text-muted">The source for this project is private.</p>}
        </div>
      );
    }
    if (t.type === "demo") {
      panels.demo = <DemoPanel slug={slug} kind={t.kind} url={t.url} name={config.name} />;
    }
    if (t.type === "code" && data) {
      panels.code = (
        <CodeBrowser slug={slug} manifest={data.manifest} initialFile={file ?? null} repoUrl={repoUrl} />
      );
    }
  }

  return (
    <div className="pt-14">
      <nav aria-label="Breadcrumb" className="font-mono text-[13px] text-dim">
        <Link href="/projects" className="hover:text-fg">
          ~/projects
        </Link>
        <span>/{slug}</span>
      </nav>

      <h1 className="mt-3 max-w-[18ch] font-mono text-[clamp(2.2rem,6vw,4rem)] font-medium leading-[1] tracking-[-0.04em] text-fg">
        {config.name}
      </h1>
      <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-muted">{config.summary}</p>

      <dl className="mt-8 grid gap-x-10 gap-y-5 border-y border-line py-5 sm:grid-cols-[auto_auto_minmax(0,1fr)]">
        <div>
          <dt className="mb-1.5 text-xs text-dim">CI</dt>
          <dd>
            <CIStatusBadge ci={data?.ci ?? null} />
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="mb-1.5 text-xs text-dim">Last commit</dt>
          <dd className="font-mono text-xs text-muted">
            {data?.commit ? (
              <>
                <span className="text-fg">{data.commit.sha.slice(0, 7)}</span>{" "}
                <RelativeTime iso={data.commit.date} className="text-dim" />
                <span className="mt-1 block max-w-[40ch] truncate">{data.commit.message}</span>
              </>
            ) : (
              "not synced yet"
            )}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="mb-1.5 text-xs text-dim">
            Languages
            {repoUrl ? (
              <a href={repoUrl} className="ml-3 text-dim hover:text-link" target="_blank" rel="noopener noreferrer">
                {config.github}
              </a>
            ) : (
              <span className="ml-3">private repository</span>
            )}
          </dt>
          <dd>
            <LanguageBar languages={data?.languages ?? []} />
          </dd>
        </div>
      </dl>

      <div className="mt-10">
        <ProjectTabs tabs={tabTypes} initial={initial} panels={panels} />
      </div>
    </div>
  );
}
