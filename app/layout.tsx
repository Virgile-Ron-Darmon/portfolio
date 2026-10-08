import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { StatusBar } from "@/components/StatusBar";
import { Providers } from "@/components/Providers";
import { getSiteConfig } from "@/lib/projects";
import { listProjects } from "@/lib/data";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const site = getSiteConfig();
  return {
    title: { default: `${site.name}, ${site.role.toLowerCase()}`, template: `%s | ${site.name}` },
    description: site.tagline,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = getSiteConfig();
  const projects = await listProjects();

  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh">
        <Providers>
          <div aria-hidden className="bg-grid pointer-events-none fixed inset-x-0 top-0 -z-10 h-[90vh]" />
          <StatusBar
            session={site.handle}
            projects={projects.map((p) => ({ slug: p.slug, name: p.name, state: p.data?.ci?.state ?? null }))}
          />
          <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">{children}</main>
          <footer className="mx-auto max-w-6xl px-4 font-mono text-xs text-dim sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-6">
              <span>
                {site.name}
                {site.location ? `, ${site.location}` : ""}
              </span>
              <span className="flex gap-4">
                {site.links.map((l) => (
                  <a key={l.label} href={l.url} className="hover:text-fg">
                    {l.label}
                  </a>
                ))}
              </span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
