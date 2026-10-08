import { LiveFrame } from "./demo/LiveFrame";
import { MockDashboard } from "./demo/MockDashboard";

/** Embeds the Grafana dashboard set in GRAFANA_DASHBOARD_URL, or a mock with the same layout. */
export function GrafanaEmbed() {
  const url = process.env.GRAFANA_DASHBOARD_URL?.trim();
  if (url) return <LiveFrame src={url} title="Grafana dashboard" height={820} />;
  return (
    <>
      <MockDashboard />
      <p className="mt-4 font-mono text-xs text-dim">
        Simulated data. Set GRAFANA_DASHBOARD_URL to embed the real dashboard.
      </p>
    </>
  );
}
