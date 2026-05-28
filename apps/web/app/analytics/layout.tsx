import type { ReactNode } from "react";
import Link from "next/link";

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col p-6 gap-2">
        <div className="font-bold text-2xl text-brand-700 mb-8">Analytics</div>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors text-sm font-medium"
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors text-sm font-medium mt-8 pt-8 border-t border-gray-200"
        >
          Voltar ao Dashboard
        </Link>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}

const NAV_ITEMS = [
  { label: "Overview", href: "/analytics/overview" },
  { label: "Funnel", href: "/analytics/funnel" },
  { label: "Cohorts", href: "/analytics/cohorts" },
  { label: "Revenue", href: "/analytics/revenue" },
];
