"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const POINTS = 48;
const TICK_MS = 2000;

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function walk(start: number, spread: number, rand: () => number, n = POINTS) {
  const out = [start];
  for (let i = 1; i < n; i++) {
    const prev = out[i - 1];
    out.push(Math.max(start * 0.3, prev + (rand() - 0.5) * spread + (start - prev) * 0.15));
  }
  return out;
}

interface SeriesDef {
  title: string;
  unit: string;
  base: number;
  spread: number;
  color: string;
  digits?: number;
}

const SERIES: SeriesDef[] = [
  { title: "Requests per second", unit: "req/s", base: 42, spread: 9, color: "var(--color-link)" },
  { title: "p95 latency", unit: "ms", base: 118, spread: 22, color: "var(--color-sand)" },
  { title: "CPU, all nodes", unit: "%", base: 31, spread: 6, color: "var(--color-ok)" },
];

function useSeries(defs: SeriesDef[], seed: number) {
  const [data, setData] = useState(() => {
    const rand = seeded(seed);
    return defs.map((d) => walk(d.base, d.spread, rand));
  });
  const [tick, setTick] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => {
      setData((prev) =>
        prev.map((series, i) => {
          const d = defs[i];
          const last = series[series.length - 1];
          const next = Math.max(d.base * 0.3, last + (Math.random() - 0.5) * d.spread + (d.base - last) * 0.15);
          return [...series.slice(1), next];
        }),
      );
      setTick((t) => t + 1);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [defs, reduce]);

  return { data, tick, live: !reduce };
}

function TimeSeries({ def, values, tick, live }: { def: SeriesDef; values: number[]; tick: number; live: boolean }) {
  const W = 400;
  const H = 120;
  const max = Math.max(...values) * 1.15;
  const step = W / (POINTS - 2);
  const pts = values.map((v, i) => [i * step, H - (v / max) * H] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0]},${H} L0,${H} Z`;
  const current = values[values.length - 1];
  const gradId = `g-${def.title.replace(/\W/g, "")}`;

  return (
    <Panel title={def.title} value={`${current.toFixed(def.digits ?? 0)} ${def.unit}`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-28 w-full overflow-hidden" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={def.color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={def.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="var(--color-line)" strokeDasharray="2 4" />
        ))}
        <motion.g
          key={tick}
          initial={{ x: live ? step : 0 }}
          animate={{ x: 0 }}
          transition={{ duration: TICK_MS / 1000, ease: "linear" }}
        >
          <path d={area} fill={`url(#${gradId})`} />
          <path d={line} fill="none" stroke={def.color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </motion.g>
      </svg>
    </Panel>
  );
}

function Panel({ title, value, children, className }: { title: string; value?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col rounded-md border border-line bg-panel p-4", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[13px] text-muted">{title}</h3>
        {value && <span className="font-mono text-sm tabular-nums text-fg">{value}</span>}
      </div>
      {children}
    </div>
  );
}

function Budget({ remaining }: { remaining: number }) {
  return (
    <Panel title="Error budget, 30 days">
      <p className="font-mono text-4xl tabular-nums tracking-tight text-ok">{remaining.toFixed(1)}%</p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-panel-2">
        <motion.div
          className="h-full rounded-full bg-ok"
          initial={{ width: 0 }}
          animate={{ width: `${remaining}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <p className="mt-3 text-xs text-dim">Target 99.9% availability. 0.1% of requests may fail per month.</p>
    </Panel>
  );
}

function Uptime() {
  const days = Array.from({ length: 30 }, (_, i) => (i === 18 ? "warn" : "ok"));
  return (
    <Panel title="Uptime, 30 days" value="99.96%" className="lg:col-span-2">
      <div className="flex h-10 items-end gap-[3px]" aria-label="29 healthy days, 1 degraded">
        {days.map((d, i) => (
          <motion.span
            key={i}
            className={cn("flex-1 rounded-[2px]", d === "ok" ? "bg-ok/70" : "bg-warn")}
            initial={{ height: "20%", opacity: 0 }}
            animate={{ height: "100%", opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.015, duration: 0.3 }}
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-dim">One degraded day: a node rebuild during a kernel upgrade.</p>
    </Panel>
  );
}

/** Stand-in for the Grafana embed. Same panel layout, simulated data. */
export function MockDashboard({ compact = false }: { compact?: boolean }) {
  const { data, tick, live } = useSeries(SERIES, 42);
  return (
    <div className={cn("grid gap-3", compact ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3")}>
      {SERIES.map((def, i) => (
        <TimeSeries key={def.title} def={def} values={data[i]} tick={tick} live={live} />
      ))}
      <Budget remaining={87.4} />
      {!compact && <Uptime />}
    </div>
  );
}
