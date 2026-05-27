interface SimplePieChartProps {
  title: string;
  data: Array<{ label: string; value: number; color: string }>;
}

export function SimplePieChart({ title, data }: SimplePieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  let currentAngle = 0;
  const slices = data.map((item) => {
    const sliceAngle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = 100 + 80 * Math.cos(startRad);
    const y1 = 100 + 80 * Math.sin(startRad);
    const x2 = 100 + 80 * Math.cos(endRad);
    const y2 = 100 + 80 * Math.sin(endRad);

    const largeArc = sliceAngle > 180 ? 1 : 0;

    const pathData = [
      `M 100 100`,
      `L ${x1} ${y1}`,
      `A 80 80 0 ${largeArc} 1 ${x2} ${y2}`,
      `Z`,
    ].join(" ");

    return { ...item, pathData, percentage: ((item.value / total) * 100).toFixed(1) };
  });

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
      <div className="flex flex-col lg:flex-row gap-8 items-center">
        <svg width="220" height="220" viewBox="0 0 200 200">
          {slices.map((slice, i) => (
            <path key={i} d={slice.pathData} fill={slice.color} opacity="0.9" />
          ))}
        </svg>
        <div className="space-y-3">
          {slices.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.percentage}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
