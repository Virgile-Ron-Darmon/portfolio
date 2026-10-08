import type { Metadata } from "next";
import { GrafanaEmbed } from "@/components/GrafanaEmbed";

export const metadata: Metadata = { title: "Metrics" };

export default function ObservabilityPage() {
  return (
    <div className="pt-14">
      <p className="font-mono text-[13px] text-dim">~/metrics</p>
      <h1 className="mt-2 font-mono text-4xl font-medium tracking-[-0.03em] sm:text-5xl">Metrics</h1>
      <p className="mt-4 max-w-[62ch] text-muted">
        The Grafana dashboard for the infrastructure behind this site. It refreshes every 30 seconds.
      </p>
      <div className="mt-10">
        <GrafanaEmbed />
      </div>
    </div>
  );
}
