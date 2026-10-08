import { cn, formatDuration, timeAgo } from "@/lib/utils";
import type { CiRun, CiState } from "@/lib/types";

const STATES: Record<CiState, { label: string; tone: string }> = {
  success: { label: "passing", tone: "text-ok" },
  failure: { label: "failing", tone: "text-fail" },
  in_progress: { label: "running", tone: "text-warn" },
  queued: { label: "queued", tone: "text-warn" },
  cancelled: { label: "cancelled", tone: "text-dim" },
  unknown: { label: "unknown", tone: "text-dim" },
};

export function StatusDot({ state, className }: { state: CiState; className?: string }) {
  const live = state === "in_progress" || state === "queued";
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full bg-current",
        STATES[state].tone,
        live && "animate-pulse-dot",
        className,
      )}
    />
  );
}

export function CIStatusBadge({ ci, detailed = false }: { ci: CiRun | null; detailed?: boolean }) {
  if (!ci) return <span className="font-mono text-xs text-dim">no CI runs</span>;
  const s = STATES[ci.state];
  return (
    <a
      href={ci.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-2 font-mono text-xs text-muted hover:text-fg"
      title={`Workflow "${ci.workflow}" on ${ci.branch}`}
    >
      <StatusDot state={ci.state} />
      <span className={s.tone}>{s.label}</span>
      {ci.durationSec != null && <span className="text-dim">{formatDuration(ci.durationSec)}</span>}
      {detailed && (
        <span className="text-dim">
          {ci.workflow} on {ci.branch}, {timeAgo(ci.startedAt)}
        </span>
      )}
    </a>
  );
}
