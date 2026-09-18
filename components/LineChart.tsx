export function LineChart({
  points,
  height = 120,
  color = "var(--accent)",
  format,
}: {
  points: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
  format?: (v: number) => string;
}) {
  const width = 600;
  const padding = 8;
  const values = points.map((p) => p.value);
  const max = Math.max(...values, 0.0001);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const step = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = padding + i * step;
    const y = padding + (1 - (p.value - min) / range) * (height - padding * 2);
    return { x, y, ...p };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");
  const areaPath = `${path} L${coords[coords.length - 1]?.x ?? padding},${height - padding} L${padding},${height - padding} Z`;

  const last = coords[coords.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none" role="img">
      <path d={areaPath} fill={color} opacity={0.08} />
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {last && <circle cx={last.x} cy={last.y} r={3} fill={color} />}
      {format && last && (
        <text x={Math.min(last.x, width - 60)} y={Math.max(last.y - 8, 10)} fontSize={11} fill="var(--muted)">
          {format(last.value)}
        </text>
      )}
    </svg>
  );
}
