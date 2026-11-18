/**
 * Line chart over the history periods (used for weight and BMI): one slot
 * per period (oldest left), a point where the period has a value, and a
 * line connecting those points. Empty slots stay empty so spacing stays
 * true to time. Hand-drawn SVG in theme colors.
 */

const WIDTH = 320;
const HEIGHT = 160;
const PAD = { top: 12, right: 12, bottom: 12, left: 36 };

export interface ChartPoint {
  label: string;
  value: number | null;
}

interface Props {
  /** Used in the screen-reader summary, e.g. "Weight". */
  name: string;
  /** Appended to values, e.g. " lb"; "" for BMI. */
  unit: string;
  points: ChartPoint[];
  /** Axis padding and rounding step (BMI 0.5, weight 1). */
  step: number;
}

export function LineChart({ name, unit, points, step }: Props) {
  const values = points.map((p) => p.value).filter((v): v is number => v !== null);
  if (values.length === 0) return null;

  // Y range: the data, padded by one step and rounded out to whole steps.
  const lo = Math.floor((Math.min(...values) - step) / step) * step;
  const hi = Math.ceil((Math.max(...values) + step) / step) * step;
  const axisDecimals = Number.isInteger(step) ? 0 : 1;
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? plotW / 2 : (i * plotW) / (points.length - 1));
  const y = (v: number) => PAD.top + ((hi - v) / (hi - lo)) * plotH;

  const plotted = points.flatMap((p, i) => (p.value === null ? [] : [{ label: p.label, value: p.value, cx: x(i), cy: y(p.value) }]));
  const path = plotted.map((p, i) => `${i === 0 ? "M" : "L"}${p.cx.toFixed(1)},${p.cy.toFixed(1)}`).join(" ");
  const show = (v: number) => `${v.toFixed(1)}${unit}`;
  const first = plotted[0];
  const last = plotted[plotted.length - 1];
  const summary =
    plotted.length === 1
      ? `${name} ${show(first.value)} for ${first.label}.`
      : `${name} went from ${show(first.value)} (${first.label}) to ${show(last.value)} (${last.label}).`;

  return (
    <figure className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={summary} className="w-full">
        {/* Axis lines and labels */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={HEIGHT - PAD.bottom} className="stroke-line" />
        <line x1={PAD.left} y1={HEIGHT - PAD.bottom} x2={WIDTH - PAD.right} y2={HEIGHT - PAD.bottom} className="stroke-line" />
        {[hi, lo].map((v) => (
          <text key={v} x={PAD.left - 6} y={y(v) + 4} textAnchor="end" className="fill-muted text-[10px]">
            {v.toFixed(axisDecimals)}
          </text>
        ))}
        {/* Slot ticks, so empty periods are visible */}
        {points.map((_, i) => (
          <line key={i} x1={x(i)} y1={HEIGHT - PAD.bottom} x2={x(i)} y2={HEIGHT - PAD.bottom + 3} className="stroke-line" />
        ))}
        <path d={path} fill="none" strokeWidth={2} className="stroke-foreground" />
        {plotted.map((p) => (
          <circle key={p.label} cx={p.cx} cy={p.cy} r={3} className="fill-foreground">
            <title>{`${p.label}: ${show(p.value)}`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="text-xs text-muted">
        {points[0].label} → {points[points.length - 1].label}
      </figcaption>
    </figure>
  );
}
