import type { Metadata } from "next";
import { InfraDiagram } from "@/components/InfraDiagram";
import { getInfraConfig } from "@/lib/projects";

export const metadata: Metadata = { title: "Infrastructure" };

export default function InfrastructurePage() {
  const config = getInfraConfig();
  return (
    <div className="pt-14">
      <p className="font-mono text-[13px] text-dim">~/infrastructure</p>
      <h1 className="mt-2 font-mono text-4xl font-medium tracking-[-0.03em] sm:text-5xl">Infrastructure</h1>
      <p className="mt-4 max-w-[62ch] text-muted">
        How this site is hosted. Select a component to see what it does and what it talks to. Moving dots show the
        direction data flows.
        <span className="md:hidden"> Drag to see the rest of the diagram.</span>
      </p>
      <div className="mt-10">
        <InfraDiagram config={config} />
      </div>

      <section aria-labelledby="components-heading" className="mt-12">
        <h2 id="components-heading" className="font-mono text-sm text-muted">
          Components
        </h2>
        <dl className="mt-4 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {config.nodes.map((n) => (
            <div key={n.id}>
              <dt className="font-mono text-sm text-fg">
                {n.label}
                {n.tech && <span className="ml-2 text-xs text-dim">{n.tech}</span>}
              </dt>
              <dd className="mt-1 text-sm text-muted">{n.detail}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
