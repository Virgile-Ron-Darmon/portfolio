import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type Edge, type EdgeProps } from "@xyflow/react";

type LinkData = { lineStyle?: "solid" | "dashed" | "dotted"; double?: boolean; color?: string };
export type LinkEdgeType = Edge<LinkData, "link">;

const dashes = { solid: undefined, dashed: "8 6", dotted: "2 4" };

export function LinkEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label, data }: EdgeProps<LinkEdgeType>) {
  const [path, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const color = data?.color ?? "var(--muted-foreground)";
  const dash = dashes[data?.lineStyle ?? "solid"];

  return (
    <>
      <BaseEdge id={id} path={path} style={{ stroke: color, strokeWidth: data?.double ? 6 : 2, strokeDasharray: dash }} />
      {data?.double && <path d={path} fill="none" style={{ stroke: "var(--background)", strokeWidth: 2 }} />}
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute rounded bg-background px-1 text-xs"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}