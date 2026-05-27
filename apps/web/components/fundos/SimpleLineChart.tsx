interface SimpleLineChartProps {
  title: string;
  data: Array<{ month: string; value: number }>;
  yAxisLabel?: string;
}

export function SimpleLineChart({ title, data, yAxisLabel = "%" }: SimpleLineChartProps) {
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const range = max - min || 1;

  const padding = 40;
  const chartWidth = 400;
  const chartHeight = 200;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * chartWidth + padding;
    const y =
      chartHeight +
      padding -
      ((d.value - min) / range) * chartHeight;
    return { x, y, ...d };
  });

  const pathData = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <svg
        width="100%"
        height="300"
        viewBox={`0 0 ${chartWidth + padding * 2} ${chartHeight + padding * 2}`}
        className="overflow-visible"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={`grid-${ratio}`}
            x1={padding}
            y1={chartHeight + padding - ratio * chartHeight}
            x2={chartWidth + padding}
            y2={chartHeight + padding - ratio * chartHeight}
            stroke="#e5e7eb"
            strokeDasharray="4"
          />
        ))}

        {/* Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={chartHeight + padding} stroke="#9ca3af" />
        <line x1={padding} y1={chartHeight + padding} x2={chartWidth + padding} y2={chartHeight + padding} stroke="#9ca3af" />

        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <text
            key={`y-label-${ratio}`}
            x={padding - 10}
            y={chartHeight + padding - ratio * chartHeight + 4}
            textAnchor="end"
            className="text-xs text-gray-500"
          >
            {((min + ratio * range) * 100).toFixed(0)}%
          </text>
        ))}

        {/* X-axis labels */}
        {points.map((p) => (
          <text
            key={`x-label-${p.month}`}
            x={p.x}
            y={chartHeight + padding + 20}
            textAnchor="middle"
            className="text-xs text-gray-500"
          >
            {p.month}
          </text>
        ))}

        {/* Line */}
        <path d={pathData} stroke="#3b82f6" strokeWidth="2" fill="none" />

        {/* Points */}
        {points.map((p) => (
          <circle
            key={`point-${p.month}`}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#3b82f6"
            stroke="white"
            strokeWidth="2"
          />
        ))}
      </svg>
    </div>
  );
}
