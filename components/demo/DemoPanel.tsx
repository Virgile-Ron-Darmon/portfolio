import fs from "node:fs";
import path from "node:path";
import { FIXTURES_DIR, isMock } from "@/lib/paths";
import { LiveFrame } from "./LiveFrame";
import { MockDashboard } from "./MockDashboard";
import { MockPlanDemo } from "./MockPlanDemo";
import { MockShell, type ShellScript } from "./MockShell";

function loadShellScript(slug: string): ShellScript | null {
  const file = path.join(FIXTURES_DIR, "demos", `${slug}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

function MockNote({ url }: { url: string }) {
  return (
    <p className="mt-3 font-mono text-xs text-dim">
      Mock demo. In live mode this panel embeds <span className="text-muted">{url}</span>
    </p>
  );
}

export function DemoPanel({ slug, kind, url, name }: { slug: string; kind: "shell" | "grafana" | "custom"; url: string; name: string }) {
  if (!isMock) return <LiveFrame src={url} title={`${name} demo`} height={kind === "shell" ? 440 : 600} />;

  if (kind === "shell") {
    const script = loadShellScript(slug);
    return (
      <>
        {script ? <MockShell script={script} /> : <p className="text-muted">No mock session in fixtures/demos/{slug}.json.</p>}
        <MockNote url={url} />
      </>
    );
  }
  if (kind === "grafana") {
    return (
      <>
        <MockDashboard compact />
        <MockNote url={url} />
      </>
    );
  }
  return (
    <>
      <MockPlanDemo url={url} />
      <MockNote url={url} />
    </>
  );
}
