"use client";

import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import type { StatusDossie } from "@imbobi/schemas";
import { STATUS_DOSSIE_BADGE, STATUS_DOSSIE_LABEL } from "./dossie-utils";

export const inputCls =
  "w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50 disabled:bg-gray-50 text-sm";

export const inputGridCls =
  "w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50 disabled:bg-gray-50 text-xs";

export const labelCls = "block text-sm font-semibold text-gray-900 mb-1.5";

export function DossieStatusBadge({ status }: { status: StatusDossie }) {
  const cls = STATUS_DOSSIE_BADGE[status] ?? "bg-gray-100 text-gray-500";
  const label = STATUS_DOSSIE_LABEL[status] ?? status;
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${cls}`}>
      {label}
    </span>
  );
}

export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-100 pb-2">
        {titulo}
      </h3>
      {children}
    </div>
  );
}

export function Campo({
  label,
  erro,
  opcional,
  children,
}: {
  label: string;
  erro?: string;
  opcional?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {opcional && <span className="font-normal text-gray-400"> (opcional)</span>}
      </label>
      {children}
      {erro && <p className="text-xs text-red-600 mt-1">{erro}</p>}
    </div>
  );
}

export function BannerErro({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
      <div className="text-sm text-red-700">{children}</div>
    </div>
  );
}

export function BannerOk({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
      <div className="text-sm text-green-700">{children}</div>
    </div>
  );
}

export function BannerAviso({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3">
      <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
      <div className="text-sm text-yellow-800">{children}</div>
    </div>
  );
}

/** Chip de métrica derivada ("calculado automaticamente"). */
export function ChipCalculado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div
      className="inline-flex items-center gap-2 bg-[#EEF3FF] border border-blue-100 rounded-xl px-3 py-2"
      title="Calculado automaticamente a partir dos dados informados"
    >
      <Sparkles className="w-3.5 h-3.5 text-[#1B4FD8] shrink-0" />
      <div>
        <p className="text-[0.65rem] text-gray-500 leading-tight">
          {rotulo} <span className="text-[#1B4FD8]">· calculado automaticamente</span>
        </p>
        <p className="text-sm font-bold text-gray-900 leading-tight">{valor}</p>
      </div>
    </div>
  );
}

export function AcoesEtapa({
  readOnly,
  salvando,
  concluida,
  onSalvar,
  onConcluir,
  rotuloConcluir = "Concluir etapa",
}: {
  readOnly: boolean;
  salvando: boolean;
  concluida: boolean;
  onSalvar?: () => void;
  onConcluir: () => void;
  rotuloConcluir?: string;
}) {
  if (readOnly) return null;
  return (
    <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
      {concluida && (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 mr-auto">
          <CheckCircle2 className="w-4 h-4" /> Etapa concluída
        </span>
      )}
      {onSalvar && (
        <button
          type="button"
          onClick={onSalvar}
          disabled={salvando}
          className="border border-gray-300 text-gray-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
        >
          {salvando ? "Salvando..." : "Salvar rascunho"}
        </button>
      )}
      <button
        type="button"
        onClick={onConcluir}
        disabled={salvando}
        className="text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-50 transition-colors text-sm hover:opacity-90"
        style={{ background: "#1B4FD8" }}
      >
        {salvando ? "Salvando..." : rotuloConcluir}
      </button>
    </div>
  );
}

/** Lista de erros por linha ("Linha 12: ..."). */
export function ErrosLinha({
  titulo,
  erros,
}: {
  titulo: string;
  erros: { linha: number; mensagens: string[] }[];
}) {
  if (erros.length === 0) return null;
  return (
    <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 space-y-1 max-h-64 overflow-y-auto">
      <p className="text-sm font-semibold text-red-700">{titulo}</p>
      {erros.map((e) => (
        <p key={`${e.linha}-${e.mensagens[0]}`} className="text-xs text-red-600">
          Linha {e.linha}: {e.mensagens.join("; ")}
        </p>
      ))}
    </div>
  );
}
