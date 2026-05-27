interface SimpleBarChartProps {
  title: string;
  data: Array<{ label: string; value: number; color: string }>;
}

export function SimpleBarChart({ title, data }: SimpleBarChartProps) {
  const max = Math.max(...data.map((d) => d.value));

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">{item.label}</label>
              <span className="text-sm font-bold text-gray-900">{item.value}</span>
            </div>
            <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
