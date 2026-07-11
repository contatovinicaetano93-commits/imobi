"use client";

import Link from "next/link";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { getPanelHome } from "@/lib/panel-navigation";

type Props = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  badge?: React.ReactNode;
};

export function GestorSubpageHeader({
  title,
  subtitle,
  backHref,
  backLabel = "Painel do Fundo",
  onRefresh,
  refreshing,
  badge,
}: Props) {
  const home = backHref ?? getPanelHome("FUNDO");
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <Link
          href={home as "/dashboard/gestor"}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-2 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {backLabel}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
      </div>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      )}
    </div>
  );
}
