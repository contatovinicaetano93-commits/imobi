"use client";

import type { ReactNode } from "react";

type MetricCardProps = {
  label: string;
  value: string;
  sub?: string;
  accent?: "blue" | "green" | "purple" | "amber" | "red";
  icon?: ReactNode;
};

const ACCENT: Record<NonNullable<MetricCardProps["accent"]>, { bg: string; text: string; border: string }> = {
  blue:   { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-100" },
  green:  { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-100" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-100" },
  amber:  { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-100" },
  red:    { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-100" },
};

export function MetricCard({ label, value, sub, accent = "blue", icon }: MetricCardProps) {
  const colors = ACCENT[accent];
  return (
    <div className={`${colors.bg} rounded-xl border ${colors.border} p-4 sm:p-5`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs sm:text-sm text-gray-600">{label}</p>
        {icon && <span className="text-gray-400 shrink-0">{icon}</span>}
      </div>
      <p className={`text-xl sm:text-2xl font-bold ${colors.text} mt-1`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
