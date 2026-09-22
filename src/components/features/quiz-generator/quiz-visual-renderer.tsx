import type { QuizVisual } from "@/types/quiz-generator";

interface GraphPoint {
  x: number;
  y: number;
}

interface GraphSeries {
  label?: string;
  points?: GraphPoint[];
}

function GraphVisual({ visual }: { visual: QuizVisual }) {
  const series = Array.isArray(visual.data.series) ? (visual.data.series as GraphSeries[]) : [];
  const points = series[0]?.points ?? [];
  if (points.length === 0) return null;

  const width = 280;
  const height = 140;
  const padding = 20;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const toSvgX = (x: number) => padding + ((x - minX) / rangeX) * (width - padding * 2);
  const toSvgY = (y: number) => height - padding - ((y - minY) / rangeY) * (height - padding * 2);

  const path = points.map((point) => `${toSvgX(point.x)},${toSvgY(point.y)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={visual.altText} className="h-auto w-full max-w-sm">
      <polyline points={path} fill="none" stroke="currentColor" strokeWidth={2} className="text-primary" />
      {points.map((point, index) => (
        <circle key={index} cx={toSvgX(point.x)} cy={toSvgY(point.y)} r={3} className="fill-primary" />
      ))}
    </svg>
  );
}

function TableVisual({ visual }: { visual: QuizVisual }) {
  const columns = Array.isArray(visual.data.columns) ? (visual.data.columns as string[]) : [];
  const rows = Array.isArray(visual.data.rows) ? (visual.data.rows as string[][]) : [];
  if (columns.length === 0 || rows.length === 0) return null;

  return (
    <div className="overflow-x-auto" role="img" aria-label={visual.altText}>
      <table className="w-full max-w-sm border-collapse text-xs">
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={index} className="border border-border bg-muted/50 px-2 py-1 text-left font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border border-border px-2 py-1">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface NumberLineMarker {
  value: number;
  label?: string;
}

function NumberLineVisual({ visual }: { visual: QuizVisual }) {
  const min = typeof visual.data.min === "number" ? visual.data.min : 0;
  const max = typeof visual.data.max === "number" ? visual.data.max : 10;
  const markers = Array.isArray(visual.data.markers) ? (visual.data.markers as NumberLineMarker[]) : [];
  const range = max - min || 1;
  const width = 280;
  const y = 20;

  const toSvgX = (value: number) => 10 + ((value - min) / range) * (width - 20);

  return (
    <svg viewBox={`0 0 ${width} 40`} role="img" aria-label={visual.altText} className="h-auto w-full max-w-sm">
      <line x1={10} y1={y} x2={width - 10} y2={y} stroke="currentColor" strokeWidth={1.5} className="text-border" />
      <circle cx={toSvgX(min)} cy={y} r={2} className="fill-muted-foreground" />
      <circle cx={toSvgX(max)} cy={y} r={2} className="fill-muted-foreground" />
      {markers.map((marker, index) => (
        <g key={index}>
          <circle cx={toSvgX(marker.value)} cy={y} r={4} className="fill-primary" />
          <text x={toSvgX(marker.value)} y={y - 8} textAnchor="middle" className="fill-foreground text-[10px]">
            {marker.label ?? marker.value}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Generic fallback for visual types that don't yet have a dedicated renderer (see architecture plan). */
function GenericVisual({ visual }: { visual: QuizVisual }) {
  return (
    <div
      role="img"
      aria-label={visual.altText}
      className="flex max-w-sm items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground"
    >
      {visual.altText}
    </div>
  );
}

/**
 * Renders a `QuizVisual` client-side from its structured `data` — never
 * raw HTML/SVG strings from the AI. Only a subset of visual types (graph,
 * table, numberLine) have a dedicated renderer for v1; the rest fall back
 * to a text description built from the required `altText`, so a question
 * never silently loses its visual information (see architecture plan,
 * Risk: visual rendering correctness).
 */
export function QuizVisualRenderer({ visual }: { visual: QuizVisual }) {
  return (
    <figure className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3">
      {visual.title ? <figcaption className="text-xs font-medium text-muted-foreground">{visual.title}</figcaption> : null}
      {visual.type === "graph" ? (
        <GraphVisual visual={visual} />
      ) : visual.type === "table" ? (
        <TableVisual visual={visual} />
      ) : visual.type === "numberLine" ? (
        <NumberLineVisual visual={visual} />
      ) : (
        <GenericVisual visual={visual} />
      )}
    </figure>
  );
}
