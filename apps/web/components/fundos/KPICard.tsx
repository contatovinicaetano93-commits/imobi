interface KPICardProps {
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  color?: "blue" | "green" | "orange" | "purple";
}

const colorMap = {
  blue: "border-blue-200 bg-blue-50",
  green: "border-green-200 bg-green-50",
  orange: "border-orange-200 bg-orange-50",
  purple: "border-purple-200 bg-purple-50",
};

const valueColorMap = {
  blue: "text-blue-900",
  green: "text-green-900",
  orange: "text-orange-900",
  purple: "text-purple-900",
};

export function KPICard({
  label,
  value,
  trend,
  trendUp = false,
  color = "blue",
}: KPICardProps) {
  return (
    <div className={`rounded-2xl p-6 border ${colorMap[color]}`}>
      <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
      <p className={`text-3xl font-bold ${valueColorMap[color]}`}>{value}</p>
      {trend && (
        <p className={`text-sm mt-3 ${trendUp ? "text-green-600" : "text-orange-600"}`}>
          {trendUp ? "↑" : "↓"} {trend}
        </p>
      )}
    </div>
  );
}
