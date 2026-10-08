"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

type Action = "create" | "update" | "destroy";
const CHANGES: { address: string; action: Action; detail: string }[] = [
  { address: "module.network.aws_subnet.nat", action: "create", detail: "cidr_block = 10.40.250.0/24" },
  { address: "module.network.aws_nat_gateway.this", action: "create", detail: "subnet_id = (known after apply)" },
  { address: "module.network.aws_route_table.private", action: "update", detail: "route.nat_gateway_id changes" },
  { address: "module.network.aws_eip.legacy_nat", action: "destroy", detail: "replaced by the dedicated NAT subnet" },
];

const SYMBOL: Record<Action, { sign: string; tone: string }> = {
  create: { sign: "+", tone: "text-ok" },
  update: { sign: "~", tone: "text-warn" },
  destroy: { sign: "-", tone: "text-fail" },
};

type Phase = "idle" | "planning" | "planned" | "applying" | "applied";

/** Stand-in for a custom demo page: a small Terraform plan and apply viewer. */
export function MockPlanDemo({ url }: { url: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [shown, setShown] = useState(0);
  const [applied, setApplied] = useState(0);

  const plan = async () => {
    setPhase("planning");
    setShown(0);
    setApplied(0);
    for (let i = 1; i <= CHANGES.length; i++) {
      await new Promise((r) => setTimeout(r, 380));
      setShown(i);
    }
    setPhase("planned");
  };

  const apply = async () => {
    setPhase("applying");
    for (let i = 1; i <= CHANGES.length; i++) {
      await new Promise((r) => setTimeout(r, 650));
      setApplied(i);
    }
    setPhase("applied");
  };

  const counts = CHANGES.reduce((acc, c) => ({ ...acc, [c.action]: acc[c.action] + 1 }), { create: 0, update: 0, destroy: 0 });

  return (
    <div className="overflow-hidden rounded-md border border-line bg-panel">
      <div className="flex items-center gap-3 border-b border-line bg-panel-2/60 px-3 py-2">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
        </span>
        <span className="min-w-0 flex-1 truncate rounded bg-bg/70 px-3 py-1 font-mono text-xs text-dim">{url}</span>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-mono text-sm text-fg">prod / network</h3>
            <p className="text-sm text-muted">Preview the change from the latest commit, then apply it.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={plan} disabled={phase === "planning" || phase === "applying"}>
              {phase === "planning" && <Loader2 className="animate-spin" />}
              {phase === "idle" ? "Run plan" : "Plan again"}
            </Button>
            <Button onClick={apply} disabled={phase !== "planned"}>
              {phase === "applying" && <Loader2 className="animate-spin" />}
              Apply
            </Button>
          </div>
        </div>

        <ul className="mt-6 space-y-1 font-mono text-[13px]" aria-live="polite">
          {phase === "idle" && <li className="text-dim">No plan yet. Run a plan to see what would change.</li>}
          <AnimatePresence>
            {CHANGES.slice(0, shown).map((c, i) => {
              const done = i < applied;
              const busy = phase === "applying" && i === applied;
              return (
                <motion.li
                  key={c.address}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn("grid grid-cols-[1.25rem_minmax(0,1fr)_1.25rem] items-start gap-2 rounded px-2 py-1.5", done && "bg-panel-2/60")}
                >
                  <span className={SYMBOL[c.action].tone}>{SYMBOL[c.action].sign}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-fg">{c.address}</span>
                    <span className="block truncate text-xs text-dim">{c.detail}</span>
                  </span>
                  <span className="pt-0.5 text-ok">
                    {done ? <Check className="size-3.5" /> : busy ? <Loader2 className="size-3.5 animate-spin text-muted" /> : null}
                  </span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        {(phase === "planned" || phase === "applying" || phase === "applied") && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 border-t border-line pt-4 font-mono text-[13px] text-muted">
            {phase === "applied" ? (
              <span className="text-ok">Apply complete. {CHANGES.length} resources changed.</span>
            ) : (
              <>
                Plan: <span className="text-ok">{counts.create} to add</span>,{" "}
                <span className="text-warn">{counts.update} to change</span>,{" "}
                <span className="text-fail">{counts.destroy} to destroy</span>.
              </>
            )}
          </motion.p>
        )}
      </div>
    </div>
  );
}
