"use client";

import { useCallback, useMemo, useState } from "react";
import {
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlow,
  getBezierPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import type { InfraConfig } from "@/lib/schema";
import { cn } from "@/lib/utils";

type Kind = InfraConfig["nodes"][number]["kind"];
type InfraNodeData = InfraConfig["nodes"][number] & { dimmed: boolean; selected: boolean; order: number };
type InfraEdgeData = { label?: string; flow: boolean; dimmed: boolean; active: boolean };

const KIND: Record<Kind, { color: string; label: string }> = {
  external: { color: "#8a939e", label: "external" },
  edge: { color: "#8ab4f8", label: "edge" },
  app: { color: "#5fd38d", label: "app" },
  service: { color: "#5fd38d", label: "service" },
  data: { color: "#e6d2a2", label: "data" },
  observability: { color: "#7fd1d1", label: "observability" },
};

function InfraNode({ data }: NodeProps<Node<InfraNodeData>>) {
  const k = KIND[data.kind];
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: data.dimmed ? 0.35 : 1, scale: 1 }}
      transition={{ delay: reduce ? 0 : 0.1 + data.order * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "w-[200px] cursor-pointer rounded-md border bg-panel px-3.5 py-3 text-left transition-[border-color,box-shadow]",
        data.selected ? "border-fg/70 shadow-[0_0_0_3px_rgba(216,221,227,0.08)]" : "border-line-strong hover:border-muted",
      )}
    >
      <Handle type="target" position={Position.Left} className="!size-1.5 !min-w-0 !border-0 !bg-transparent" />
      <div className="flex items-center gap-2 font-mono text-[11px] text-dim">
        <span className="size-1.5 rounded-full" style={{ backgroundColor: k.color }} />
        {k.label}
      </div>
      <div className="mt-1.5 font-mono text-[14px] text-fg">{data.label}</div>
      {data.tech && <div className="mt-0.5 font-mono text-[11px] text-muted">{data.tech}</div>}
      <Handle type="source" position={Position.Right} className="!size-1.5 !min-w-0 !border-0 !bg-transparent" />
    </motion.div>
  );
}

function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps<Edge<InfraEdgeData>>) {
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const reduce = useReducedMotion();
  const stroke = data?.active ? "var(--color-fg)" : "var(--color-line-strong)";
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{ stroke, strokeWidth: data?.active ? 1.5 : 1, opacity: data?.dimmed ? 0.25 : 1, transition: "opacity .2s, stroke .2s" }}
      />
      {data?.flow && !reduce && !data.dimmed && (
        <circle r="2.5" fill={data.active ? "var(--color-ok)" : "var(--color-muted)"}>
          <animateMotion dur={`${2.2 + (id.length % 5) * 0.35}s`} repeatCount="indefinite" path={path} />
        </circle>
      )}
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              "pointer-events-none absolute rounded-sm bg-bg px-1.5 font-mono text-[10.5px] transition-opacity",
              data.active ? "text-fg" : "text-dim",
              data.dimmed && "opacity-25",
            )}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = { infra: InfraNode };
const edgeTypes = { flow: FlowEdge };

export function InfraDiagram({ config }: { config: InfraConfig }) {
  const [selected, setSelected] = useState<string | null>(null);

  const connected = useMemo(() => {
    if (!selected) return null;
    const set = new Set([selected]);
    for (const e of config.edges) {
      if (e.from === selected) set.add(e.to);
      if (e.to === selected) set.add(e.from);
    }
    return set;
  }, [selected, config.edges]);

  const order = useMemo(() => {
    const xs = [...new Set(config.nodes.map((n) => n.x))].sort((a, b) => a - b);
    return (x: number, y: number) => xs.indexOf(x) * 2 + y / 400;
  }, [config.nodes]);

  const nodes: Node<InfraNodeData>[] = config.nodes.map((n) => ({
    id: n.id,
    type: "infra",
    position: { x: n.x, y: n.y },
    data: { ...n, dimmed: !!connected && !connected.has(n.id), selected: n.id === selected, order: order(n.x, n.y) },
  }));

  const edges: Edge<InfraEdgeData>[] = config.edges.map((e, i) => {
    const active = !!selected && (e.from === selected || e.to === selected);
    return {
      id: `e${i}-${e.from}-${e.to}`,
      source: e.from,
      target: e.to,
      type: "flow",
      data: { label: e.label, flow: e.flow, active, dimmed: !!selected && !active },
    };
  });

  const onNodeClick = useCallback((_: unknown, node: Node) => setSelected((s) => (s === node.id ? null : node.id)), []);
  const current = config.nodes.find((n) => n.id === selected);
  const links = current
    ? config.edges
        .filter((e) => e.from === current.id || e.to === current.id)
        .map((e) => {
          const otherId = e.from === current.id ? e.to : e.from;
          const other = config.nodes.find((n) => n.id === otherId)!;
          return { dir: e.from === current.id ? "to" : "from", other, label: e.label };
        })
    : [];

  return (
    <div className="relative overflow-hidden rounded-md border border-line bg-panel/40">
      <div className="h-[62vh] min-h-[420px] md:h-[68vh] md:min-h-[440px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={() => setSelected(null)}
          fitView
          fitViewOptions={{ padding: 0.12, minZoom: 0.55 }}
          minZoom={0.3}
          maxZoom={1.6}
          nodesConnectable={false}
          zoomOnScroll={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: false }}
        >
          <Controls showInteractive={false} position="bottom-left" />
        </ReactFlow>
      </div>

      <AnimatePresence>
        {current && (
          <motion.aside
            key={current.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="border-t border-line bg-panel p-5 md:absolute md:right-3 md:top-3 md:w-[320px] md:rounded-md md:border md:shadow-2xl md:shadow-black/50"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-mono text-[11px] text-dim">
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: KIND[current.kind].color }} />
                  {KIND[current.kind].label}
                  {current.tech ? `, ${current.tech}` : ""}
                </p>
                <h2 className="mt-1 font-mono text-lg text-fg">{current.label}</h2>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-dim hover:text-fg" aria-label="Close details">
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{current.detail}</p>
            {links.length > 0 && (
              <ul className="mt-4 space-y-1.5 border-t border-line pt-4 font-mono text-xs">
                {links.map((l, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setSelected(l.other.id)}
                      className="flex w-full items-center gap-2 text-left text-muted hover:text-fg"
                    >
                      <span className="w-8 text-dim">{l.dir}</span>
                      {l.other.label}
                      {l.label && <span className="ml-auto text-dim">{l.label}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
