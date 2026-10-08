import type { Metadata } from "next";
import { ProjectTable } from "@/components/ProjectTable";
import { listProjects } from "@/lib/data";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const projects = await listProjects();
  return (
    <div className="pt-16">
      <p className="font-mono text-[13px] text-dim">~/projects</p>
      <h1 className="mt-2 font-mono text-4xl font-medium tracking-[-0.03em] sm:text-5xl">Projects</h1>
      <p className="mt-4 max-w-[60ch] text-muted">
        Each project syncs from its GitHub repository on every push. CI status updates when a workflow run finishes.
      </p>
      <div className="mt-10">
        <ProjectTable projects={projects} />
      </div>
    </div>
  );
}
