"use client";

import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { formatarBRL } from "@imbobi/core";
import type { ObraResumo } from "@/lib/api";
import { STATUS_BADGE, STATUS_LABEL, STATUS_PROGRESS_COLOR } from "./obra-status";

type ObraCardProps = {
  obra: ObraResumo;
  variant?: "card" | "list";
  selected?: boolean;
  onSelect?: (id: string) => void;
};

export function ObraCard({ obra, variant = "card", selected, onSelect }: ObraCardProps) {
  const progress = obra.progresso ?? 0;
  const barColor = STATUS_PROGRESS_COLOR[obra.status] ?? "bg-gray-400";
  const badge = STATUS_BADGE[obra.status] ?? "bg-gray-100 text-gray-500";
  const label = STATUS_LABEL[obra.status] ?? obra.status.replace(/_/g, " ");

  const creditoBlock = obra.credito ? (
    <>
      <div>
        <p className="text-xs text-gray-400 mb-0.5">Crédito aprovado</p>
        <p className="text-sm font-semibold text-gray-700">
          {formatarBRL(Number(obra.credito.valorAprovado))}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs text-gray-400 mb-0.5">Liberado</p>
        <p className="text-sm font-semibold text-[#16a34a]">
          {formatarBRL(Number(obra.credito.valorLiberado))}
        </p>
      </div>
    </>
  ) : (
    <p className="text-xs text-gray-400">Sem crédito vinculado</p>
  );

  const className =
    variant === "list"
      ? `group flex items-center gap-4 bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-all ${
          selected ? "border-[#1B4FD8] ring-2 ring-blue-100" : "border-gray-100"
        }`
      : `group bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-4 ${
          selected ? "border-[#1B4FD8] ring-2 ring-blue-100" : "border-gray-100"
        }`;

  const inner = (
    <>
      <div className={`flex items-start justify-between gap-3 ${variant === "list" ? "flex-1 min-w-0" : ""}`}>
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="p-2 bg-gray-50 rounded-xl shrink-0 group-hover:bg-blue-50 transition-colors">
            <Building2 className="w-5 h-5 text-gray-400 group-hover:text-[#1B4FD8] transition-colors" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{obra.nome}</h3>
            {obra.endereco && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{obra.endereco}</p>
            )}
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${badge}`}>
          {label}
        </span>
      </div>

      {variant === "card" && (
        <div>
          <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
            <span className="font-medium">Progresso geral</span>
            <span className="font-bold text-gray-700">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} rounded-full transition-all duration-500`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div
        className={`flex items-center justify-between ${
          variant === "card" ? "pt-2 border-t border-gray-50" : "shrink-0 gap-6"
        }`}
      >
        {variant === "list" ? (
          <div className="flex items-center gap-6 text-sm">{creditoBlock}</div>
        ) : (
          creditoBlock
        )}
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#1B4FD8] transition-colors shrink-0" />
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(obra.id)}
        className={`${className} text-left w-full`}
      >
        {inner}
      </button>
    );
  }

  return (
    <Link href={`/dashboard/obras/${obra.id}`} className={className}>
      {inner}
    </Link>
  );
}
