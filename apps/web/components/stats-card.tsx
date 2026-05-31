import { ReactNode } from "react";

interface StatsCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: ReactNode;
  trend?: { value: number; direction: "up" | "down" };
  action?: {
    label: string;
    href: string;
  };
}

export function StatsCard({
  label,
  value,
  subtext,
  icon,
  trend,
  action,
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        {icon && <div className="text-2xl opacity-75">{icon}</div>}
      </div>

      {subtext && <p className="text-xs text-gray-400">{subtext}</p>}

      {trend && (
        <div className="mt-3 flex items-center gap-1">
          <span
            className={`text-xs font-semibold ${
              trend.direction === "up" ? "text-green-600" : "text-red-600"
            }`}
          >
            {trend.direction === "up" ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
        </div>
      )}

      {action && (
        <a
          href={action.href}
          className="inline-block text-xs text-brand-600 font-semibold hover:underline mt-3"
        >
          {action.label} →
        </a>
      )}
    </div>
  );
}

export function StatsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {children}
    </div>
  );
}
