import Link from "next/link";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateAction {
  label: string;
  href: Route;
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  children?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
}: EmptyStateProps) {
  const ActionIcon = action?.icon;

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex flex-col items-center gap-4 ${className ?? ""}`}
    >
      <div className="p-5 bg-gray-50 rounded-2xl">
        <Icon className="w-12 h-12 text-gray-300" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-700 text-lg mb-1">{title}</p>
        {description && (
          <p className="text-sm text-gray-400 max-w-xs">{description}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="mt-2 inline-flex items-center gap-2 bg-[#1B4FD8] hover:bg-blue-800 text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-sm hover:shadow transition-all duration-200"
        >
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          {action.label}
        </Link>
      )}
      {children}
    </div>
  );
}
